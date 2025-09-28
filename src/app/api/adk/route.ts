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

    // Try parse; if it fails, attempt a heuristic sanitizer for inner quotes
    try {
      return JSON.parse(s);
    } catch {
      const fixed = sanitizeJsonLikeString(s);
      return JSON.parse(fixed);
    }
  } catch {
    return input;
  }
}

function sanitizeJsonLikeString(s: string): string {
  // Escape suspicious inner quotes inside JSON string values to help JSON.parse succeed
  let out = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        out += ch;
        escape = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escape = true;
        continue;
      }
      if (ch === '"') {
        // Peek next non-space to decide if it's a terminator
        let j = i + 1;
        while (j < s.length && /\s/.test(s[j])) j++;
        if (j >= s.length || [",", "}", "]", ":"].includes(s[j])) {
          out += ch;
          inString = false;
        } else {
          out += '\\"';
        }
        continue;
      }
      out += ch;
    } else {
      if (ch === '"') {
        out += ch;
        inString = true;
      } else {
        out += ch;
      }
    }
  }
  return out;
}

function tryParseJsonLike(input: unknown): any {
  if (typeof input !== "string") return input;
  const parsed = tryParseLLMJson(input);
  return parsed;
}

function normalizePayload(data: any): any {
  let obj: any = data;

  // If entire response is a JSON string, parse it
  if (typeof obj === "string") {
    const parsed = tryParseJsonLike(obj);
    if (parsed && typeof parsed === "object") obj = parsed;
  }

  // If { result: "..." }, parse it
  if (obj && typeof obj === "object" && typeof obj.result === "string") {
    const parsed = tryParseJsonLike(obj.result);
    if (parsed && typeof parsed === "object") {
      obj = { ...obj, result: parsed };
    }
  }

  // Work with the final payload (obj.result if present, else obj)
  let payload: any = obj?.result ?? obj;

  // Parse if payload itself is a string JSON
  if (typeof payload === "string") {
    const p = tryParseJsonLike(payload);
    if (p && typeof p === "object") payload = p;
  }

  // Unwrap/parse output field if present
  if (payload && typeof payload === "object") {
    const out = (payload as any).output;
    if (typeof out === "string") {
      const p = tryParseJsonLike(out);
      if (p && typeof p === "object") payload = p;
    } else if (out && typeof out === "object") {
      // If output is already structured, unwrap it
      payload = out;
    }

    // Optionally parse nested JSON-like strings
    if (typeof (payload as any).video === "string") {
      const p = tryParseJsonLike((payload as any).video);
      if (p && typeof p === "object") (payload as any).video = p;
    }
    if (typeof (payload as any).metrics === "string") {
      const p = tryParseJsonLike((payload as any).metrics);
      if (p && typeof p === "object") (payload as any).metrics = p;
    }
    if (typeof (payload as any).personas === "string") {
      const p = tryParseJsonLike((payload as any).personas);
      if (Array.isArray(p)) (payload as any).personas = p;
    }
  }

  return payload;
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

    // Normalize and sanitize before sending to the GUI
    const normalizedResult = normalizePayload(data);
    const finalPayload = sanitizeNewlines(
      data && typeof data === "object"
        ? { ...(data as any), result: normalizedResult }
        : normalizedResult
    );
    return NextResponse.json(finalPayload);
  } catch (error) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
