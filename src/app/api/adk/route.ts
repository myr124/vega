import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string | null;
    const video = formData.get("video") as File | null;
    const videoUri = formData.get("video_uri") as string | null;
    const keys = Array.from(formData.keys());
    console.log("[/api/adk] incoming keys:", keys, {
      prompt: !!prompt,
      video: !!video,
      videoUri: !!videoUri,
    });

    if (!prompt && !video && !videoUri) {
      return NextResponse.json(
        { ok: false, error: "Either prompt, video, or video_uri is required" },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    if (prompt) {
      backendFormData.append("prompt", prompt);
    }
    if (videoUri) {
      backendFormData.append("video_uri", videoUri);
    } else if (video) {
      backendFormData.append("video", video, video.name);
    }
    console.log("[/api/adk] forwarding to backend with:", {
      prompt: !!prompt,
      video: !!video,
      videoUri: !!videoUri,
    });

    const backendResponse = await fetch("http://localhost:2000/agent/run", {
      method: "POST",
      body: backendFormData,
    });

    if (!backendResponse.ok) {
      return NextResponse.json(
        { ok: false, error: "Backend request failed" },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
