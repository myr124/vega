#!/usr/bin/env python3
"""
Backend: Simple Google ADK (Agent Development Kit) agent instance. 

Model Authentication (choose ONE):
- Google AI Studio (API key):
    In src/backend/.env
      GOOGLE_GENAI_USE_VERTEXAI=FALSE
      GOOGLE_API_KEY=PASTE_YOUR_API_KEY
- Google Cloud Vertex AI (ADC; no API key):
    In src/backend/.env
      GOOGLE_GENAI_USE_VERTEXAI=TRUE
      GOOGLE_CLOUD_PROJECT=your-project-id
      GOOGLE_CLOUD_LOCATION=us-central1
    And authenticate locally:
      gcloud auth application-default login

Run options (from the repo root):
- Dev UI:
    PYTHONPATH=src adk web
  Then open the shown URL (e.g., http://localhost:8000) and select the "backend" package.
- Terminal runner:
    PYTHONPATH=src adk run backend

Notes:
- ADK discovers Python agents from a package. src/backend is your package directory.
  If ADK doesn’t detect the agent, ensure:
    - There is an __init__.py in src/backend/ (create one if missing)
    - You set PYTHONPATH=src when running adk commands
"""

import datetime
import os
from typing import Any, Dict
from zoneinfo import ZoneInfo

# Load local env if present
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

from google.adk.agents import Agent


def get_weather(city: str) -> Dict[str, Any]:
    """
    Retrieves a simple demo weather report for a specified city.
    Returns:
      dict with keys: status, report (or error_message)
    """
    if city.lower() == "new york":
        return {
            "status": "success",
            "report": (
                "The weather in New York is sunny with a temperature of 25°C (77°F)."
            ),
        }
    return {
        "status": "error",
        "error_message": f"Weather information for '{city}' is not available.",
    }


def get_current_time(city: str) -> Dict[str, Any]:
    """
    Returns the current local time for a limited demo set.
    Only supports 'New York' for this example.
    """
    if city.lower() != "new york":
        return {
            "status": "error",
            "error_message": f"Sorry, I don't have timezone information for {city}.",
        }

    tz = ZoneInfo("America/New_York")
    now = datetime.datetime.now(tz)
    report = f"The current time in {city} is {now.strftime('%Y-%m-%d %H:%M:%S %Z%z')}"
    return {"status": "success", "report": report}


def _model_id() -> str:
    # You can override the default model with ADK_MODEL in .env
    # Examples: gemini-2.0-flash, gemini-2.0-pro, gemini-2.0-flash-live-001 (for live)
    return os.getenv("ADK_MODEL", "gemini-2.0-flash")


# Global agent that ADK CLI/Dev UI can discover.
root_agent = Agent(
    name="vega_adk_agent",
    model=_model_id(),
    description="Agent to answer questions about the time and weather in a city.",
    instruction=(
        "You are a helpful agent who can answer user questions about the time "
        "and weather in a city."
    ),
    tools=[get_weather, get_current_time],
)


if __name__ == "__main__":
    # Informative entrypoint. Use ADK CLI to run the agent.
    print(
        "This module defines 'root_agent' for Google ADK.\n\n"
        "Run Dev UI:\n"
        "  PYTHONPATH=src adk web\n\n"
        "Run in terminal:\n"
        "  PYTHONPATH=src adk run backend\n\n"
        "Ensure model auth is configured in src/backend/.env as documented in the file."
    )
