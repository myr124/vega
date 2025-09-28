import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "avatars");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter(
        (e) =>
          e.isFile() &&
          e.name.toLowerCase().endsWith(".json") &&
          e.name.toLowerCase() !== "manifest.json"
      )
      .map((e) => `/avatars/${e.name}`);
    return NextResponse.json(files);
  } catch {
    // If folder doesn't exist or any error occurs, return empty list
    return NextResponse.json([]);
  }
}
