import os

# Load environment variables
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

from typing import List
from pydantic import BaseModel, Field

# ADK
from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from google.adk.tools.agent_tool import AgentTool

from .util import load_instruction_from_file


# ---------------------------
# 1) Tiny schema for personas
# ---------------------------
class PersonaMiniSchema(BaseModel):
    mainCat: str
    retention: float  # 0.0–1.0
    viewed: bool
    liked: bool


# --- Sub Agent 2: Summarizer ---
summarizer_agent = LlmAgent(
    name="VideoSummarizer",
    model="gemini-2.5-flash-lite",
    instruction=load_instruction_from_file("./instructions/transcript_summarizer.txt"),
    description="Creates concise summaries from video transcripts to reduce token usage",
    output_key="video_summary",
)
summarize_tool = AgentTool(agent=summarizer_agent)

# --- Sub Agent 1: Transcriber ---
transcriber_agent = LlmAgent(
    name="VideoTranscriber",
    model="gemini-2.0-flash-lite",
    instruction=load_instruction_from_file("./instructions/video_transcriber.txt"),
    description="Transcribes audio from video files into clean, formatted text",
    tools=[summarize_tool],
    output_key="video_transcript",
)

# --- Create research agents with different personalities ---
research_agents: List[LlmAgent] = []

archetype_to_category = {
    "shopping": "Shopping",
    "music": "Music",
    "movies_tv": "Movies & Tv",
    "gaming": "Gaming",
    "news": "news",
    "sports": "Sports",
    "learning": "Learning",
    "fashion_beauty": "Fashion & Beauty",
    "technology": "Technology",
}

personality_archetypes = [
    "shopping",
    "music",
    "movies_tv",
    "gaming",
    "news",
    "sports",
    "learning",
    "fashion_beauty",
    "technology",
]
interest_levels = ["beginner", "intermediate", "expert"]

for archetype in personality_archetypes:
    category = archetype_to_category[archetype]
    for level in interest_levels:
        base = load_instruction_from_file("./instructions/enjoyer_instruction.txt")
        instruction_text = (
            base.replace("{level}", level).replace("{category}", category)
            + """
STRICT OUTPUT RULES:
Return ONLY this JSON object (no prose, no markdown, no extra keys):
{
  "mainCat": "<your category name>",
  "retention": <number between 0.0 and 1.0>,
  "viewed": <true|false>,
  "liked": <true|false>
}
Numbers must be numbers (no quotes). Booleans must be true/false (lowercase).
Do not print long analyses; keep reasoning internal.
"""
        )

        agent = LlmAgent(
            name=f"{archetype}_{level}_reviewer",
            model="gemini-2.0-flash-lite",
            instruction=instruction_text,
            description=f"{archetype} reviewer with {level} level perspective in {category}",
            output_key=f"{archetype}_{level}_review",
            # 👇 Enforce tiny persona output (prevents giant blobs)
            output_schema=PersonaMiniSchema,
        )
        research_agents.append(agent)


# ---------------------------------------------
# 2) Batch fan-out into small ParallelAgent "waves"
#    (keeps stock ADK; reduces 429s & blast radius)
# ---------------------------------------------
def chunk(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


WAVE_SIZE = 6  # tune: 6–8 is a good start
review_waves = []
for i, wave_agents in enumerate(chunk(research_agents, WAVE_SIZE), start=1):
    review_waves.append(
        ParallelAgent(
            name=f"review_wave_{i}",
            sub_agents=wave_agents,
            description=f"Reviewer wave #{i} (size={len(wave_agents)})",
        )
    )


# --- Output schema for the merger (the big final object you already use) ---
class outputSchema(BaseModel):
    output: str = Field(
        description=load_instruction_from_file("./instructions/outputschema.txt")
    )


# --- Merger Agent ---
# TIP in your synthesis_prompt.txt:
# - Read only persona keys that end with "_review".
# - Ignore any missing keys (some personas may fail).
# - Produce exactly ONE final JSON into output_key="final_summary".
merger_agent = LlmAgent(
    name="merger_agent",
    model="gemini-2.5-flash-lite",
    instruction=load_instruction_from_file("./instructions/synthesis_prompt.txt"),
    description="Merges and synthesizes outputs from multiple reviewer agents into a cohesive final output.",
    output_schema=outputSchema,
    output_key="final_summary",
)

# --- Sequential Pipeline (unchanged pattern) ---
# Just insert the waves instead of one massive parallel.
sequential_pipeline_agent = SequentialAgent(
    name="VideoAnalysisPipeline",
    sub_agents=[
        transcriber_agent,  # Phase 1
        *review_waves,  # Phase 2: multiple small ParallelAgent batches
        merger_agent,  # Phase 3
    ],
    description="Coordinates video processing, batched parallel reviews, and synthesis.",
)

root_agent = sequential_pipeline_agent
