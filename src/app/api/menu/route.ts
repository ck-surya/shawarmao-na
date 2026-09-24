import { api } from "@/lib/http";
import { getMenu, settings } from "@/lib/repository";
export const dynamic = "force-dynamic";
export async function GET() {
  return api(async () => ({ items: await getMenu(), ...settings() }));
}
