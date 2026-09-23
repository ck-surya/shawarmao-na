import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";
import { AppError } from "./domain";

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_PHOTO_BYTES + 64 * 1024;
const filenamePattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.webp$/;

export function photoDirectory() {
  return resolve(
    /* turbopackIgnore: true */ process.env.MENU_UPLOAD_DIR ||
      join(
        dirname(process.env.DATABASE_PATH || "./data/restaurant.sqlite"),
        "uploads",
      ),
  );
}

// Bound actual bytes, including requests without a Content-Length header.
export async function readPhotoForm(req: Request) {
  if (Number(req.headers.get("content-length")) > MAX_REQUEST_BYTES)
    throw new AppError("Choose a photo smaller than 10 MB.", 413);
  if (!req.body) throw new AppError("No upload received.");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new AppError("Choose a photo smaller than 10 MB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "Content-Type": req.headers.get("content-type") || "" },
    }).formData();
  } catch {
    throw new AppError("The upload could not be read. Choose the photo again.");
  }
}

export async function savePhoto(file: File) {
  if (!file.size) throw new AppError("Choose a photo to upload.");
  if (file.size > MAX_PHOTO_BYTES)
    throw new AppError("Choose a photo smaller than 10 MB.", 413);
  let output: Buffer;
  try {
    const photo = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 50_000_000,
    });
    const metadata = await photo.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format))
      throw new Error("Unsupported image format");
    output = await photo
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new AppError(
      "Use a valid JPG, PNG or WebP photo, up to 50 megapixels.",
    );
  }
  const filename = `${randomUUID()}.webp`;
  const directory = photoDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, filename), output, {
    flag: "wx",
    mode: 0o600,
  });
  return `/images/uploads/${filename}`;
}

export async function readPhoto(filename: string) {
  if (!filenamePattern.test(filename)) return null;
  try {
    return await readFile(join(photoDirectory(), filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// Only roll back this request's new upload; old URLs can still be in use.
export async function discardPhoto(path: string) {
  const filename = path.slice("/images/uploads/".length);
  if (path.startsWith("/images/uploads/") && filenamePattern.test(filename))
    await unlink(join(photoDirectory(), filename));
}
