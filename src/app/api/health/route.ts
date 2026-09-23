import { db } from "@/lib/db";
import { photoDirectory } from "@/lib/menu-photos";
import { open, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const connection = db();
    // A real write transaction checks that SQLite remains writable.
    connection.exec("BEGIN IMMEDIATE");
    try {
      connection.exec("UPDATE sessions SET expires=expires WHERE 0");
    } finally {
      connection.exec("ROLLBACK");
    }
    const directory = photoDirectory();
    await mkdir(directory, { recursive: true });
    const probe = join(directory, `.health-${randomUUID()}`);
    const file = await open(probe, "wx", 0o600);
    try {
      await file.write("ok");
    } finally {
      await file.close();
      await unlink(probe);
    }
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
