import { randomUUID } from "node:crypto";
import { api, body, checkOrigin, requireAdmin } from "@/lib/http";
import { getMenu, saveMenu } from "@/lib/db";
import { AppError, menuSchema } from "@/lib/domain";
import { discardPhoto, readPhotoForm, savePhoto } from "@/lib/menu-photos";

export const runtime = "nodejs";
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
    let input: unknown;
    let photo: File | null = null;
    if (req.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await readPhotoForm(req);
      const raw = form.get("item");
      if (typeof raw !== "string" || raw.length > 20000)
        throw new AppError("Invalid menu item.");
      try {
        input = JSON.parse(raw);
      } catch {
        throw new AppError("Invalid menu item.");
      }
      const file = form.get("photo");
      if (!(file instanceof File))
        throw new AppError("Choose a photo to upload.");
      photo = file;
    } else {
      input = await body(req);
    }
    const data = menuSchema.parse(input);
    const item = { ...data, id: data.id || randomUUID() };
    const uploaded = photo ? await savePhoto(photo) : null;
    if (uploaded) item.image = uploaded;
    try {
      saveMenu(item);
    } catch (error) {
      if (uploaded) await discardPhoto(uploaded);
      throw error;
    }
    return { item };
  });
}
