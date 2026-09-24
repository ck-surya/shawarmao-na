// Resize large phone photos before transport to fit serverless request limits.
// The server still validates/decodes every image and strips metadata.
export async function preparePhoto(file: File): Promise<File> {
  if (file.size <= 3 * 1024 * 1024) return file;
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 10 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "This photo could not be read. Choose a JPG, PNG or WebP photo.",
    );
  }
  try {
    if (bitmap.width * bitmap.height > 50_000_000)
      throw new Error("Choose a photo under 50 megapixels.");
    const ratio = Math.min(1, 1600 / bitmap.width, 1600 / bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Unable to prepare this photo. Try a smaller image.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob || blob.size > 3 * 1024 * 1024)
      throw new Error(
        "This photo is too large to upload. Choose a smaller image.",
      );
    return new File([blob], "menu-photo.webp", { type: blob.type });
  } finally {
    bitmap.close();
  }
}
