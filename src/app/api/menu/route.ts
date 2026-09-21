import { api } from "@/lib/http";
import { getMenu, settings } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  return api(() => ({ items: getMenu(), ...settings() }));
}
