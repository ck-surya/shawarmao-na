import { api, body, checkOrigin, requireAdmin } from "@/lib/http";
import { updateStatus } from "@/lib/repository";
import { states } from "@/lib/domain";
import { z } from "zod";
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    await requireAdmin();
    const { id, status } = z
      .object({ id: z.string().uuid(), status: z.enum(states) })
      .strict()
      .parse(await body(req));
    await updateStatus(id, status);
    return { ok: true };
  });
}
