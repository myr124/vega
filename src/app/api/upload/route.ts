import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Server-side upload using the Supabase service role key to bypass RLS.
// Expects multipart/form-data with field "file" (File/Blob).
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "file is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server misconfigured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const ext = file.name.includes(".") ? file.name.split(".").pop() : "mp4";
    const fileName = `${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;
    const path = `uploads/${fileName}`;

    // Convert to bytes for Node environment
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: upErr } = await supabase.storage
      .from("videos")
      .upload(path, bytes, {
        cacheControl: "3600",
        contentType: file.type || "video/mp4",
        upsert: false,
      });

    if (upErr) {
      return NextResponse.json(
        {
          ok: false,
          error: upErr.message || "Storage upload failed",
          code: (upErr as any)?.statusCode ?? (upErr as any)?.status ?? 400,
        },
        { status: 400 }
      );
    }

    const { data: pub } = supabase.storage.from("videos").getPublicUrl(path);
    const publicUrl = pub?.publicUrl;

    // Also generate a short-lived signed URL in case the bucket is private
    const { data: signed } = await supabase.storage
      .from("videos")
      .createSignedUrl(path, 60 * 60); // 1 hour

    const signedUrl = signed?.signedUrl;

    return NextResponse.json({ ok: true, path, publicUrl, signedUrl });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
