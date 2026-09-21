import {
  api,
  body,
  checkOrigin,
  login,
  logout,
  requireAdmin,
} from "@/lib/http";
import { rateLimit } from "@/lib/db";
import { z } from "zod";
export async function GET() {
  return api(async () => {
    await requireAdmin();
    return { authenticated: true };
  });
}
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    rateLimit("login", 10, 600000);
    const { password } = z
      .object({ password: z.string().max(200) })
      .parse(await body(req));
    await login(password);
    return { ok: true };
  });
}
export async function DELETE(req: Request) {
  return api(async () => {
    checkOrigin(req);
    await logout();
    return { ok: true };
  });
}
