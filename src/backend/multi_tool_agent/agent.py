# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Shows how to call all the sub-agents using the LLM's reasoning ability. Run this with "adk run" or "adk web"

import os

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

from google.adk.agents import LlmAgent,ParallelAgent, SequentialAgent
from google.adk.tools import google_search
from google.adk.tools.agent_tool import AgentTool

from .util import load_instruction_from_file

# --- Sub Agent 2: Summarizer ---
summarizer_agent = LlmAgent(
    name="VideoSummarizer", 
    model="gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/transcript_summarizer.txt"),
    description="Creates concise summaries from video transcripts to reduce token usage",
    output_key="video_summary",  # Save result to state
)

summarize_tool = AgentTool(agent=summarizer_agent)

# --- Sub Agent 1: Transcriber ---
transcriber_agent = LlmAgent(
    name="VideoTranscriber",
    model="gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/video_transcriber.txt"),
    description="Transcribes audio from video files into clean, formatted text",
    tools=[summarize_tool],
    output_key="video_transcript",  # Save result to state
)

# --- Main YouTube Agent ---
youtube_agent = LlmAgent(
    name="youtube_agent",
    model="gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/youtube_instruction.txt"),
    description="Agent to create YouTube Shorts from video files using sub-agents.",
    sub_agents=[transcriber_agent, summarizer_agent]  # Individual agents, not pipeline
)

interest_levels = ["beginner", "intermediate", "expert"]

# Archetype base instruction file mapping. Use specific instruction files if available.
arch_instructions = {
    "enjoyer": "./instructions/enjoyer_instruction.txt",
    "shopping": "./instructions/enjoyer_instruction.txt",
    "music": "./instructions/enjoyer_instruction.txt",
    "movies_tv": "./instructions/enjoyer_instruction.txt",
    "gaming": "./instructions/enjoyer_instruction.txt",
    "news": "./instructions/enjoyer_instruction.txt",
    "sports": "./instructions/enjoyer_instruction.txt",
    "learning": "./instructions/enjoyer_instruction.txt",
    "course": "./instructions/enjoyer_instruction.txt",
    "fashionBeauty": "./instructions/enjoyer_instruction.txt",
    "hater": "./instructions/enjoyer_instruction.txt",
}

# Create three agents (beginner/intermediate/expert) for each archetype.
generated_agents: list[LlmAgent] = []
for archetype, instr_path in arch_instructions.items():
    for level in interest_levels:
        agent_name = f"{archetype}_{level}_agent"
        # Load the archetype-specific instruction and substitute the {level} placeholder
        instruction_text = load_instruction_from_file(instr_path).replace("{level}", level)
        a = LlmAgent(
            name=agent_name,
            model="gemini-2.5-flash",
            instruction=instruction_text,
            description=f"{archetype} agent for {level} level",
            output_key="video_transcript",
        )
        generated_agents.append(a)

# Use the generated agents as the pool for parallel research
agents: list[LlmAgent] = generated_agents


for interest in interest_levels:
    for agent in agents:
        agent.instruction = agent.instruction.replace("{level}", interest)
        # Ensure output_key is a string (remove accidental tuple trailing comma)
        agent.output_key = "video_transcript"
        # NOTE: LlmAgent does not define a `prompt` field (it's a pydantic model).
        # Do not assign arbitrary attributes on the agent instances. If you need
        # to build a prompt that includes the transcript, do that at runtime when
        # invoking the agent/runner instead of mutating the LlmAgent object here.

parallel_research_agent = ParallelAgent(
    name="parallel_research_agent",
    # model="gemini-2.5-flash",
    sub_agents = generated_agents,
    description = "Runs multiple agents in parallel"
)

merger_agent = LlmAgent(
    name="merger_agent",
    model="gemini-2.5-flash",
    description="Merges and synthesizes outputs from multiple agents into a cohesive final output.",
    # prompt="Here are the outputs from various agents: {agent_outputs}. Please merge them into a single, coherent summary.",
    output_key="final_summary",
)

# --- Root Agent for the Runner ---
# Create a sequential root agent so that the youtube_agent runs first,
# then the parallel_research_agent executes, and finally the merger_agent
# synthesizes outputs from the previous steps.
root_agent = SequentialAgent(
    name="root_sequential_agent",
    sub_agents=[youtube_agent, parallel_research_agent, merger_agent],
    description="Run youtube pipeline, then run parallel research agents, then merge outputs",
)
