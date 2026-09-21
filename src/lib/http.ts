import { cookies } from "next/headers";
import { timingSafeEqual, randomBytes } from "node:crypto";
import { ZodError } from "zod";
import { AppError } from "./domain";
import { db, hash } from "./db";
export async function requireAdmin() {
  const token = (await cookies()).get("staff_session")?.value;
  if (
    !token ||
    !db()
      .prepare("SELECT token FROM sessions WHERE token=? AND expires>?")
      .get(hash(token), Date.now())
  )
    throw new AppError("Please sign in to continue.", 401);
}
export function checkOrigin(req: Request) {
  // Next may normalize the internal URL hostname. The browser's Host header
  // identifies the public authority; proxies should set APP_ORIGIN explicitly.
  const expected =
    process.env.APP_ORIGIN ||
    `${new URL(req.url).protocol}//${req.headers.get("host")}`;
  if (req.headers.get("origin") !== expected)
    throw new AppError("Request origin not allowed", 403);
}
export async function body(req: Request) {
  const raw = await req.text();
  if (raw.length > 20000) throw new AppError("Request too large", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("Invalid JSON");
  }
}
export async function login(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || expected.length < 16)
    throw new AppError(
      "Staff access needs a configured password of at least 16 characters.",
      503,
    );
  if (
    !timingSafeEqual(Buffer.from(hash(password)), Buffer.from(hash(expected)))
  )
    throw new AppError("Incorrect password", 401);
  const token = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES(?,?)")
    .run(hash(token), Date.now() + 8 * 60 * 60 * 1000);
  (await cookies()).set("staff_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("staff_session")?.value;
  if (token)
    db().prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
  jar.delete("staff_session");
}
export async function api(fn: () => unknown | Promise<unknown>) {
  try {
    return Response.json(await fn(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof ZodError)
      return Response.json(
        { error: e.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    if (e instanceof AppError)
      return Response.json({ error: e.message }, { status: e.status });
    console.error(
      "API operation failed",
      e instanceof Error ? e.name : "unknown",
    );
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
