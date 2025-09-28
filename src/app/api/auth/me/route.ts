import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Return null user if not authenticated; keep 200 to simplify client logic
      return NextResponse.json(
        { user: null, error: error.message },
        { status: 200 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { user: null, error: e?.message || "unknown" },
      { status: 200 }
    );
  }
}
