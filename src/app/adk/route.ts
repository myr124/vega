import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const prompt = formData.get("prompt") as string | null;
    const video = formData.get("video") as File | null;

    if (!prompt && !video) {
      return NextResponse.json(
        { ok: false, error: "Either prompt or video is required" },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    if (prompt) {
      backendFormData.append("prompt", prompt);
    }
    if (video) {
      backendFormData.append("video", video, video.name);
    }

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
