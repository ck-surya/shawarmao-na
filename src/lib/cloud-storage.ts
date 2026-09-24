function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage is not configured");
  if (new URL(url).protocol !== "https:")
    throw new Error("Supabase requires HTTPS");
  return {
    url: url.replace(/\/$/, ""),
    key,
    bucket: process.env.SUPABASE_STORAGE_BUCKET || "menu-photos",
  };
}
export async function storageRequest(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/storage/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, ...init.headers },
  });
  if (!response.ok && response.status !== 404)
    throw new Error(`Storage request failed (${response.status})`);
  return response;
}
export async function writeCloudPhoto(filename: string, bytes: Uint8Array) {
  const { bucket } = config();
  const response = await storageRequest(
    `object/${encodeURIComponent(bucket)}/${filename}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "31536000",
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes),
    },
  );
  if (!response.ok) throw new Error("Photo bucket is missing");
}
export async function readCloudPhoto(filename: string) {
  const { bucket } = config();
  const response = await storageRequest(
    `object/authenticated/${encodeURIComponent(bucket)}/${filename}`,
  );
  return response.status === 404
    ? null
    : Buffer.from(await response.arrayBuffer());
}
export async function deleteCloudPhoto(filename: string) {
  const { bucket } = config();
  await storageRequest(`object/${encodeURIComponent(bucket)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [filename] }),
  });
}
export async function cloudStorageHealth() {
  const { bucket } = config();
  if (!(await storageRequest(`bucket/${encodeURIComponent(bucket)}`)).ok)
    throw new Error("Photo bucket is missing");
}
