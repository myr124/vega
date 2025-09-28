import os

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

from typing import Any, Dict, List, Optional, AsyncGenerator
import asyncio, random

from pydantic import BaseModel, Field

# ADK imports
from google.adk.agents import LlmAgent, SequentialAgent, BaseAgent
from google.adk.events import Event
from google.adk.agents import InvocationContext  # type: ignore
from google.adk.tools.agent_tool import AgentTool

from .util import load_instruction_from_file

# ---------- ResilientParallelAgent (ADK-compliant custom agent) ----------
try:
    from google.api_core.exceptions import (
        ResourceExhausted,
        DeadlineExceeded,
        ServiceUnavailable,
        InternalServerError,
    )
    TRANSIENT_EXC = (ResourceExhausted, DeadlineExceeded, ServiceUnavailable, InternalServerError)
except Exception:
    TRANSIENT_EXC = tuple()  # fall back to message-based hints below

class ResilientParallelAgent(BaseAgent):
    """
    Fault-tolerant parallel orchestrator for ADK.
    - Subclass of BaseAgent (so it plugs into SequentialAgent).
    - Runs sub-agents concurrently with a semaphore.
    - Retries transient errors (429/5xx/timeouts) per-branch.
    - Never crashes siblings; records {output_key}__error in session.state.
    - Writes a health snapshot to session.state["__parallel_health__:<name>"].
    """

    sub_agents: List[BaseAgent]
    max_concurrency: int = 6
    retries: int = 3
    base_delay: float = 0.6
    max_delay: float = 6.0
    jitter: float = 0.35
    timeout_s: Optional[float] = 60.0
    annotate_errors: bool = True

    async def _run_one_branch(
        self, ctx: InvocationContext, agent: BaseAgent, sem: asyncio.Semaphore
    ) -> Dict[str, Any]:
        output_key = getattr(agent, "output_key", f"{agent.name}_output")
        attempt = 0

        async with sem:
            while True:
                attempt += 1
                try:
                    # Consume and forward all events from the sub-agent so they appear in the runner/console
                    async def _drain() -> None:
                        if self.timeout_s:
                            # time-box the sub-agent
                            async def _with_timeout():
                                async for ev in agent.run_async(ctx):
                                    # forward events upstream
                                    yield ev
                            # Wrap the async generator in a task that yields
                            gen = _with_timeout()
                            try:
                                while True:
                                    ev = await asyncio.wait_for(gen.__anext__(), timeout=self.timeout_s)
                                    # re-yield events to the runner
                                    yield ev
                            except StopAsyncIteration:
                                return
                        else:
                            async for ev in agent.run_async(ctx):
                                yield ev

                    async for ev in _drain():
                        # forward each event to the runner
                        yield ev  # type: ignore  # yielded back to _run_async_impl

                    # Success path: assume agent wrote to ctx.session.state[output_key]
                    return {"ok": True, "key": output_key}

                except asyncio.TimeoutError as e:
                    if attempt <= self.retries:
                        await asyncio.sleep(self.base_delay * (1 + random.random()))
                        continue
                    msg = f"timeout after {self.retries} retries"
                    if self.annotate_errors:
                        ctx.session.state[f"{output_key}__error"] = msg
                    return {"ok": False, "key": output_key, "error": msg}

                except Exception as e:
                    # Decide if it's transient based on class or message
                    msg = str(e)
                    transient_hint = (
                        any(isinstance(e, t) for t in TRANSIENT_EXC)
                        or "429" in msg
                        or "rate" in msg.lower()
                        or "exhausted" in msg.lower()
                        or "unavailable" in msg.lower()
                        or "deadline" in msg.lower()
                        or "internal" in msg.lower()
                        or "5" == msg[:1]  # rough guard for 5xx
                    )
                    if attempt <= self.retries and transient_hint:
                        sleep_for = min(self.max_delay, self.base_delay * (2 ** (attempt - 1)))
                        jittered = sleep_for * (1 + self.jitter * (random.random() * 2 - 1))
                        await asyncio.sleep(max(0.05, jittered))
                        continue
                    if self.annotate_errors:
                        ctx.session.state[f"{output_key}__error"] = msg[:1200]
                    return {"ok": False, "key": output_key, "error": msg}

    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        sem = asyncio.Semaphore(self.max_concurrency)

        # Kick off all branches as tasks that both yield events and return a result dict
        async def _branch_task(agent: BaseAgent):
            # We need a queue to forward yielded events back to _run_async_impl.
            queue: asyncio.Queue = asyncio.Queue()

            async def _runner():
                # Collect events by putting them in a queue so the outer scope can yield them
                agen = self._run_one_branch(ctx, agent, sem)
                try:
                    async for ev in agen:  # this yields Event objects from sub-agents
                        await queue.put(ev)
                except StopAsyncIteration:
                    pass

            run_task = asyncio.create_task(_runner())

            # While the runner is active, drain events to outer generator
            while not run_task.done() or not queue.empty():
                try:
                    ev = await asyncio.wait_for(queue.get(), timeout=0.05)
                    yield ev
                except asyncio.TimeoutError:
                    await asyncio.sleep(0)  # cooperative yield

            # When finished, pull the return value from the coroutine
            try:
                result = run_task.result()  # type: ignore
            except Exception as e:
                result = {"ok": False, "key": getattr(agent, "output_key", f"{agent.name}_output"), "error": str(e)}
            return result

        # Create one branch task per sub-agent
        tasks = [ _branch_task(a) for a in self.sub_agents ]

        # Drive all branches concurrently and re-yield their events upstream
        results: List[Dict[str, Any]] = []
        for coro in asyncio.as_completed(tasks):
            # coro is an async generator returning a dict at the end; we need to consume its events.
            # Consume by iterating it here:
            gen = coro
            # Drain yielded events first
            if hasattr(gen, "__anext__"):
                try:
                    while True:
                        ev = await gen.__anext__()  # type: ignore
                        yield ev
                except StopAsyncIteration as r:
                    results.append(r.value if hasattr(r, "value") else {})  # type: ignore
            else:
                results.append(await gen)  # Fallback

        # After all branches, record a health snapshot for the merger/UI
        summary = {
            "total": len(results),
            "ok": sum(1 for r in results if r.get("ok")),
            "failed": sum(1 for r in results if not r.get("ok")),
        }
        ctx.session.state[f"__parallel_health__:{self.name}"] = summary

# ---------- Your sub-agents ----------
summarizer_agent = LlmAgent(
    name="VideoSummarizer",
    model="gemini-2.5-flash-lite",
    instruction=load_instruction_from_file("./instructions/transcript_summarizer.txt"),
    description="Creates concise summaries from video transcripts to reduce token usage",
    output_key="video_summary",
)
summarize_tool = AgentTool(agent=summarizer_agent)

transcriber_agent = LlmAgent(
    name="VideoTranscriber",
    model="gemini-2.0-flash-lite",
    instruction=load_instruction_from_file("./instructions/video_transcriber.txt"),
    description="Transcribes audio from video files into clean, formatted text",
    tools=[summarize_tool],
    output_key="video_transcript",
)

research_agents: List[LlmAgent] = []
archetype_to_category = {
    "shopping": "Shopping", "music": "Music", "movies_tv": "Movies & Tv",
    "gaming": "Gaming", "news": "news", "sports": "Sports",
    "learning": "Learning", "fashion_beauty": "Fashion & Beauty",
}
personality_archetypes = list(archetype_to_category.keys())
interest_levels = ["beginner", "intermediate", "expert"]

for archetype in personality_archetypes:
    category = archetype_to_category[archetype]
    for level in interest_levels:
        instruction_text = (
            load_instruction_from_file("./instructions/enjoyer_instruction.txt")
            .replace("{level}", level)
            .replace("{category}", category)
        )
        research_agents.append(
            LlmAgent(
                name=f"{archetype}_{level}_reviewer",
                model="gemini-2.0-flash-lite",
                instruction=instruction_text,
                description=f"{archetype} reviewer with {level} level perspective in {category}",
                output_key=f"{archetype}_{level}_review",
            )
        )

# Our resilient parallel stage (drop-in for the stock ParallelAgent)
parallel_research_agent = ResilientParallelAgent(
    name="parallel_research_agent",
    sub_agents=research_agents,
    description="Runs multiple reviewer personalities in parallel (fault-tolerant)",
    max_concurrency=6,
    retries=3,
    base_delay=0.6,
    max_delay=6.0,
    jitter=0.35,
    timeout_s=55.0,
    annotate_errors=True,
)

class outputSchema(BaseModel):
    output: str = Field(description=load_instruction_from_file("./instructions/outputschema.txt"))

merger_agent = LlmAgent(
    name="merger_agent",
    model="gemini-2.5-flash-lite",
    instruction=load_instruction_from_file("./instructions/synthesis_prompt.txt"),
    description="Merges and synthesizes outputs from multiple reviewer agents into a cohesive final output.",
    output_schema=outputSchema,
    output_key="final_summary",
)

# Root pipeline
root_agent = SequentialAgent(
    name="VideoAnalysisPipeline",
    sub_agents=[transcriber_agent, parallel_research_agent, merger_agent],
    description="Coordinates video processing, parallel research, and synthesis (resilient parallel stage).",
)
