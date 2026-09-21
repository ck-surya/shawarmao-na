import { randomUUID } from "node:crypto";
import { api, body, checkOrigin, requireAdmin } from "@/lib/http";
import { getMenu, saveMenu } from "@/lib/db";
import { menuSchema } from "@/lib/domain";
export async function GET() {
  return api(async () => {
    await requireAdmin();
    return { items: getMenu(true) };
  });
}
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    await requireAdmin();
    const data = menuSchema.parse(await body(req));
    const item = { ...data, id: data.id || randomUUID() };
    saveMenu(item);
    return { item };
  });
}
