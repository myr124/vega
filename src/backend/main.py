import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from multi_tool_agent.agent import root_agent
from google.adk.runners import Runner, types
from google.adk.sessions import InMemorySessionService

import base64


# Load environment variables
load_dotenv()
env_path = Path(__file__).with_name(".env")
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Import the existing agent and Google ADK components


class RunRequest(BaseModel):
    prompt: Optional[str] = Form(None)
    video: Optional[UploadFile] = File(None)


class RunResponse(BaseModel):
    ok: bool
    result: Optional[Any] = None
    error: Optional[str] = None


def _extract_result(raw: Any) -> Any:
    """
    Extract the result from the agent's raw output.
    """
    if isinstance(raw, tuple) and len(raw) == 2:
        return raw[0]  # Assume first element is the result
    elif hasattr(raw, "result") or hasattr(raw, "output"):
        return getattr(raw, "result", getattr(raw, "output", raw))
    return raw


app = FastAPI(title="Agent Backend", version="0.1.0")

# CORS configuration
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
allow_origins = [
    frontend_origin,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/agent/run", response_model=RunResponse)
async def run_agent(
    prompt: Optional[str] = Form(None), video: Optional[UploadFile] = File(None)
) -> RunResponse:
    if not prompt and not video:
        raise HTTPException(
            status_code=400, detail="Either prompt or video is required"
        )

    try:
        session_service = InMemorySessionService()
        runner = Runner(
            app_name="vega-agent", agent=root_agent, session_service=session_service
        )
        user_id = "test_user"
        session_id = "test_session"
        # Create session if not exists
        session_service.create_session_sync(
            app_name="vega-agent", user_id=user_id, session_id=session_id
        )

        parts = []
        if prompt:
            parts.append(types.Part(text=prompt.strip()))

        if video:
            video_bytes = await video.read()
            # Force video/mp4 for MP4 files, as content_type may default to octet-stream
            if video.filename and video.filename.lower().endswith(".mp4"):
                mime_type = "video/mp4"
            else:
                mime_type = video.content_type or "video/mp4"
            base64_data = base64.b64encode(video_bytes).decode("utf-8")
            file_data = types.Blob(mime_type=mime_type, data=base64_data)
            parts.append(types.Part(inline_data=file_data))

        if not parts:
            parts.append(types.Part(text="Process this video for YouTube Shorts."))

        new_message = types.Content(parts=parts, role="user")
        events = list(
            runner.run(user_id=user_id, session_id=session_id, new_message=new_message)
        )
        print("Events:", [str(e) for e in events])  # Debug print
        # Extract result from events
        result = None
        for event in reversed(events):
            if event.content and event.content.parts:
                result = event.content.parts[0].text
                break
        if result is None:
            result = "No response generated"

        # Ensure JSON-serializable
        safe_result = jsonable_encoder(result, custom_encoder={set: list})

        return RunResponse(
            ok=True,
            result=safe_result,
        )
    except Exception as e:
        return RunResponse(ok=False, error=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="localhost", port=2000, reload=True)
