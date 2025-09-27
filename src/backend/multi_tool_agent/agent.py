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

from google.adk.agents import LlmAgent, SequentialAgent
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

#archtype agents for different interests
enjoyer_agent = LlmAgent(
    name = "enjoyer_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/enjoyer_instruction.txt"),
    description="An archtype agent that enjoys any of the 9 categories by level",
)

shopping_agent = LlmAgent(
    name = "shopping_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/shopping_instruction.txt"),
    description="An agent that helps with shopping by level",
)

music_agent = LlmAgent(
    name = "music_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/music_instruction.txt"),
    description="An agent that helps with music by level",
)

movies_tv_agent = LlmAgent(
    name = "music_tv_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/movies&TV_instruction.txt"),
    description="An agent that helps with music and TV by level",
)

gaming_agent = LlmAgent(
    name = "gaming_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/gaming_instruction.txt"),
    description="An agent that helps with gaming by level",
)

news_agent = LlmAgent(
    name = "news_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/news_instruction.txt"),
    description="An agent that helps with news by level",
)

sports_agent = LlmAgent(
    name = "sports_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/sports_instruction.txt"),
    description="An agent that helps with sports by level",
)

learning_agent = LlmAgent(
    name = "learning_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/learning_instruction.txt"),
    description="An agent that helps with learning by level",
)

course_agent = LlmAgent(
    name = "course_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/course_instruction.txt"),
    description="An agent that helps with courses",
)

fashionBeauty_agent = LlmAgent(
    name = "fashionBeauty_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/fashionBeauty_instruction.txt"),
    description="An agent that helps with fashion and beauty by level",
)

hater_agent = LlmAgent(
    name = "hater_agent",
    model = "gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/hater_instruction.txt"),
    description="An agent that hates everything",
)

agents: list[LlmAgent] = [
    enjoyer_agent,
    shopping_agent,
    music_agent,
    movies_tv_agent,
    gaming_agent,
    news_agent,
    sports_agent,
    learning_agent,
    course_agent,
    fashionBeauty_agent,
    hater_agent
]

def run_agents_by_interest():
    for interest in interest_levels:
        for agent in agents:
            agent.instruction = agent.instruction.replace("{level}", interest)
            agent.prompt = f"Here is the video transcript:. Please follow the instructions: {agent.instruction}"


run_agents_by_interest()

# --- Root Agent for the Runner ---
# The runner will now execute the workflow
root_agent = youtube_agent
