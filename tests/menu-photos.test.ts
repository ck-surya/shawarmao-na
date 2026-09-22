import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  MAX_PHOTO_BYTES,
  discardPhoto,
  readPhoto,
  readPhotoForm,
  savePhoto,
} from "../src/lib/menu-photos";

test("uploaded photos are oriented, resized, stripped of metadata and persisted under safe names", async () => {
  const directory = await mkdtemp(join(tmpdir(), "menu-photo-test-"));
  const previous = process.env.MENU_UPLOAD_DIR;
  process.env.MENU_UPLOAD_DIR = directory;
  try {
    const original = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: "orange" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const path = await savePhoto(
      new File([new Uint8Array(original)], "../../phone.jpg", {
        type: "image/jpeg",
      }),
    );
    assert.match(path, /^\/images\/uploads\/[a-f0-9-]+\.webp$/);
    const stored = await readPhoto(path.split("/").at(-1)!);
    assert.ok(stored);
    const metadata = await sharp(stored).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 1600);
    assert.equal(metadata.exif, undefined);
    assert.equal(await readPhoto("../../.env.local"), null);
    await assert.rejects(
      savePhoto(new File(["<svg></svg>"], "fake.jpg", { type: "image/jpeg" })),
      /valid JPG/,
    );
    await assert.rejects(
      savePhoto(new File([new Uint8Array(MAX_PHOTO_BYTES + 1)], "large.jpg")),
      /10 MB/,
    );
    assert.equal((await readdir(directory)).length, 1);
    await discardPhoto(path);
    assert.equal(await readPhoto(path.split("/").at(-1)!), null);
  } finally {
    if (previous === undefined) delete process.env.MENU_UPLOAD_DIR;
    else process.env.MENU_UPLOAD_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});

test("multipart reader handles valid data and limits streams without Content-Length", async () => {
  const data = new FormData();
  data.set("item", '{"name":"Test photo"}');
  data.set("photo", new File(["fixture"], "test.jpg"));
  const parsed = await readPhotoForm(
    new Request("http://localhost/upload", { method: "POST", body: data }),
  );
  assert.equal(parsed.get("item"), data.get("item"));
  assert.equal((parsed.get("photo") as File).name, "test.jpg");
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("http://localhost/upload", {
    method: "POST",
    body: stream,
    duplex: "half",
    headers: { "Content-Type": "multipart/form-data; boundary=test" },
  } as RequestInit);
  await assert.rejects(readPhotoForm(request), /10 MB/);
  assert.equal(cancelled, true);
  await assert.rejects(
    readPhotoForm(
      new Request("http://localhost/upload", {
        method: "POST",
        body: "bad form",
        headers: { "Content-Type": "multipart/form-data" },
      }),
    ),
    /could not be read/,
  );
});
