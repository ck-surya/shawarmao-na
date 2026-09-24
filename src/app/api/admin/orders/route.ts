import { api, requireAdmin } from "@/lib/http";
import { listOrders } from "@/lib/repository";
export async function GET() {
  return api(async () => {
    await requireAdmin();
    return { orders: await listOrders() };
  });
}
