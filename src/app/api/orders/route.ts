import { api, body, checkOrigin } from "@/lib/http";
import { createOrder, rateLimit } from "@/lib/repository";
import { orderSchema } from "@/lib/domain";
export async function POST(req: Request) {
  return api(async () => {
    checkOrigin(req);
    await rateLimit("orders", 60, 60000);
    return createOrder(orderSchema.parse(await body(req)));
  });
}
