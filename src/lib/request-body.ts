import { AppError } from "./domain";

// Check the stream itself: Content-Length may be absent or inaccurate.
export async function readJsonBody(req: Request) {
  const limit = 20_000;
  if (Number(req.headers.get("content-length")) > limit)
    throw new AppError("Request too large", 413);
  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          throw new AppError("Request too large", 413);
        }
        chunks.push(value);
      }
    }
  } finally {
    reader?.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("Invalid JSON");
  }
}
