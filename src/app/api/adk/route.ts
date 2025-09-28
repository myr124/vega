import { NextRequest, NextResponse } from "next/server";

function tryParseLLMJson(input: unknown): unknown {
  try {
    if (typeof input !== "string") return input;
    let s = input.trim();

    // If wrapped in markdown code fences, extract inner content
    const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      s = fenceMatch[1].trim();
    }

    // Narrow to the first {...} block if extra text surrounds it
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
    }

    // JSON.parse will correctly handle \n sequences when they are part of strings
    return JSON.parse(s);
  } catch {
    // If parsing fails, return original input
    return input;
  }
}

function sanitizeNewlines(value: any): any {
  if (typeof value === "string") {
    // Replace actual newline chars and escaped \n sequences; collapse extra spaces
    return value
      .replace(/\r?\n/g, " ")
      .replace(/\\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeNewlines);
  }
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeNewlines(v);
    }
    return out;
  }
  return value;
}

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

    // Normalize Gemini output that may come back as a JSON string (with \n and/or code fences)
    let normalized: any = data;

    if (typeof data === "string") {
      const parsed = tryParseLLMJson(data);
      normalized = parsed ?? data;
    } else if (
      data &&
      typeof data === "object" &&
      typeof (data as any).result === "string"
    ) {
      const parsed = tryParseLLMJson((data as any).result);
      if (parsed && typeof parsed === "object") {
        normalized = { ...(data as any), result: parsed };
      }
    }

    const sanitized = sanitizeNewlines(normalized);
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
