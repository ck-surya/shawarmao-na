import { api } from "@/lib/http";
import { findOrder } from "@/lib/repository";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  return api(async () => findOrder((await params).token));
}
