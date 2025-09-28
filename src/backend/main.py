import os
import logging
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
import json
import datetime
import tempfile
import subprocess
import shutil
import asyncio
import httpx


# Load environment variables
load_dotenv()
env_path = Path(__file__).with_name(".env")
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Import the existing agent and Google ADK components


class RunRequest(BaseModel):
    prompt: Optional[str] = Form(None)
    video: Optional[UploadFile] = File(None)
    video_uri: Optional[str] = Form(None)


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


def compress_video_bytes(
    input_bytes: bytes, original_filename: Optional[str] = None, target_ext: str = "mp4"
) -> bytes:
    """
    Compress video bytes using the system ffmpeg CLI.

    - If ffmpeg is not installed or compression fails, returns the original bytes.
    - Writes temporary files to disk for ffmpeg to operate on.
    """
    if not shutil.which("ffmpeg"):
        print("WARNING: ffmpeg not found on PATH; skipping compression")
        return input_bytes

    in_path = None
    out_path = None
    try:
        # Choose input suffix from original filename if available
        suffix = f".{target_ext}"
        if original_filename:
            try:
                orig_suffix = Path(original_filename).suffix
                if orig_suffix:
                    suffix = orig_suffix
            except Exception:
                pass

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as in_f:
            in_f.write(input_bytes)
            in_path = in_f.name

        fd, out_path = tempfile.mkstemp(suffix=f".{target_ext}")
        # close the low-level fd; we'll open by name later
        try:
            os.close(fd)
        except Exception:
            pass

        # Basic ffmpeg compression settings: re-encode with libx264 and moderate CRF.
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            in_path,
            "-vcodec",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "28",
            "-acodec",
            "aac",
            "-b:a",
            "96k",
            "-movflags",
            "+faststart",
            out_path,
        ]

        # Run ffmpeg (capture output to avoid noisy logs)
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        with open(out_path, "rb") as f:
            out_bytes = f.read()

        # If compression produced a (reasonably) smaller file, return it; otherwise return original
        if len(out_bytes) < len(input_bytes) or len(out_bytes) > 0:
            return out_bytes
        return input_bytes
    except Exception as e:
        print(f"WARNING: video compression failed: {e}")
        return input_bytes
    finally:
        try:
            if in_path and os.path.exists(in_path):
                os.remove(in_path)
        except Exception:
            pass
        try:
            if out_path and os.path.exists(out_path):
                os.remove(out_path)
        except Exception:
            pass


def _extract_json_objects_from_text(text: str) -> list:
    """Attempt to extract any JSON objects/arrays embedded in a text blob.

    Uses json.JSONDecoder.raw_decode to robustly find JSON starting at any position.
    Returns a list of parsed Python objects.
    """
    objs = []
    try:
        decoder = json.JSONDecoder()
        idx = 0
        L = len(text or "")
        while idx < L:
            # find next possible JSON start
            next_start = None
            for i in range(idx, L):
                if text[i] in "{[":
                    next_start = i
                    break
            if next_start is None:
                break
            try:
                obj, end = decoder.raw_decode(text[next_start:])
                objs.append(obj)
                idx = next_start + end
            except Exception:
                # Move forward and keep searching
                idx = next_start + 1
    except Exception:
        pass
    return objs


app = FastAPI(title="Agent Backend", version="0.1.0")

# Configure logging to show INFO messages from libraries and agent runtime
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    prompt: Optional[str] = Form(None),
    video: Optional[UploadFile] = File(None),
    video_uri: Optional[str] = Form(None),
) -> RunResponse:
    print(
        f"[run_agent] Received prompt={bool(prompt)} video_present={bool(video)} video_uri_present={bool(video_uri)}"
    )
    if not prompt and not video and not video_uri:
        raise HTTPException(
            status_code=400, detail="Either prompt, video, or video_uri is required"
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

        video_bytes: Optional[bytes] = None
        mime_type: Optional[str] = None
        original_filename: Optional[str] = (
            getattr(video, "filename", None) if video else None
        )

        if video_uri:
            try:
                async with httpx.AsyncClient(
                    follow_redirects=True, timeout=60.0
                ) as client:
                    resp = await client.get(video_uri)
                    resp.raise_for_status()
                    video_bytes = resp.content
                    ct = resp.headers.get("Content-Type")
                    if ct:
                        mime_type = ct
                    print(
                        f"[run_agent] Fetched video from URI; bytes={len(video_bytes) if video_bytes else 0} mime={mime_type}"
                    )
            except Exception as e:
                print(f"WARNING: failed to fetch video from URI: {e}")
                video_bytes = None

            if not mime_type:
                if isinstance(video_uri, str) and video_uri.lower().endswith(".mp4"):
                    mime_type = "video/mp4"
                else:
                    mime_type = "application/octet-stream"

        elif video:
            video_bytes = await video.read()
            # Force video/mp4 for MP4 files, as content_type may default to octet-stream
            if video.filename and video.filename.lower().endswith(".mp4"):
                mime_type = "video/mp4"
            else:
                mime_type = video.content_type or "video/mp4"
            print(
                f"[run_agent] Received video file upload; bytes={len(video_bytes) if video_bytes else 0} mime={mime_type}"
            )

        if video_bytes:
            # Try to compress the video bytes in a thread to avoid blocking the event loop
            try:
                compressed_bytes = await asyncio.to_thread(
                    compress_video_bytes, video_bytes, original_filename, "mp4"
                )
            except Exception as e:
                print(f"WARNING: compression thread failed: {e}")
                compressed_bytes = video_bytes

            base64_data = base64.b64encode(compressed_bytes).decode("utf-8")
            file_data = types.Blob(mime_type=mime_type or "video/mp4", data=base64_data)
            parts.append(types.Part(inline_data=file_data))

        if not parts:
            parts.append(types.Part(text="Process this video for YouTube Shorts."))

        new_message = types.Content(parts=parts, role="user")

        # Stream runner events so we can log status as they arrive
        events = []
        try:
            for event in runner.run(user_id=user_id, session_id=session_id, new_message=new_message):
                # Print/Log each event as it arrives to surface agent status
                try:
                    logger.info(f"Agent event: %s", str(event))
                except Exception:
                    print("Agent event:", event)
                events.append(event)
        except Exception as e:
            # In case the runner.run itself raises, capture the exception
            logger.exception("runner.run failed: %s", e)
        # Extract result from events
        result = None
        for event in reversed(events):
            if event.content and event.content.parts:
                result = event.content.parts[0].text
                break
        if result is None:
            result = "No response generated"

        # --- New: extract JSON objects produced by enjoyer/reviewer agents and persist them ---
        try:
            # Gather texts from all event parts to search for JSON
            all_text = "\n".join(
                p.text for e in events if getattr(e, "content", None) for p in e.content.parts if getattr(p, "text", None)
            )
            found = _extract_json_objects_from_text(all_text)
            if found:
                # Ensure data dir exists
                json_file = Path(__file__).parent / "data" / "json_objects.json"
                json_file.parent.mkdir(parents=True, exist_ok=True)
                # Load existing list if present
                try:
                    if json_file.exists():
                        with open(json_file, "r", encoding="utf-8") as jf:
                            existing = json.load(jf)
                            if isinstance(existing, list):
                                jsonObjectList.extend(existing)
                except Exception as e:
                    print(f"WARNING: failed to load existing json objects: {e}")

                # Append and deduplicate simple by string representation
                for obj in found:
                    try:
                        jsonObjectList.append(obj)
                    except Exception:
                        pass

                # Persist the list
                try:
                    with open(json_file, "w", encoding="utf-8") as jf:
                        json.dump(jsonObjectList, jf, ensure_ascii=False, indent=2)
                    print(f"Appended {len(found)} json object(s) to {json_file}")
                except Exception as e:
                    print(f"WARNING: failed to persist json object list: {e}")
        except Exception as e:
            print(f"WARNING: json extraction failed: {e}")

        # Ensure JSON-serializable
        safe_result = jsonable_encoder(result, custom_encoder={set: list})

        # Persist the result to a JSON file under src/backend/data
        try:
            data_dir = Path(__file__).parent / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{session_id}.json"
            filepath = data_dir / filename
            payload = {
                "meta": {
                    "app_name": "vega-agent",
                    "user_id": user_id,
                    "session_id": session_id,
                    "created_at": datetime.datetime.utcnow().isoformat() + "Z",
                },
                "result": safe_result,
            }
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
            print(f"Saved run result to {filepath}")
        except Exception as e:
            print(f"WARNING: failed to write run result to file: {e}")

        return RunResponse(
            ok=True,
            result=safe_result,
        )
    except Exception as e:
        return RunResponse(ok=False, error=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="localhost", port=2000, reload=True)


jsonObjectList = []
inputJsonObject = {}

