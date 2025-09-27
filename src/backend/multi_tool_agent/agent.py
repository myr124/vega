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

from google.adk.agents import LlmAgent
from google.adk.tools import google_search
from google.adk.tools.agent_tool import AgentTool

from .util import load_instruction_from_file

# --- Sub Agent 1: Scriptwriter ---
transcriber_agent = LlmAgent(
    name="VideoTranscriber",
    model="gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/video_transcriber.txt"),
    description="Transcribes audio from video files into clean, formatted text",
    output_key="video_transcript",  # Save result to state
)

# --- Llm Agent Workflow ---
youtube_agent = LlmAgent(
    name="youtube_agent",
    model="gemini-2.5-flash",
    instruction=load_instruction_from_file("./instructions/youtube_instruction.txt"),
    description="Agent to create YouTube Shorts from video files using sub-agents.",
    sub_agents=[transcriber_agent]
)

# --- Root Agent for the Runner ---
# The runner will now execute the workflow
root_agent = youtube_agent
