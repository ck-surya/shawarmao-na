import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateRuntime } from "../scripts/runtime-config.mjs";
import { backupRestaurant } from "../scripts/backup.mjs";
import { readJsonBody } from "../src/lib/request-body";

test("production configuration rejects unusable credentials, origins and storage settings", () => {
  const env = {
    ADMIN_PASSWORD: "test-only-long-password",
    APP_ORIGIN: "https://orders.example.com",
    DATABASE_PATH: "/app/data/restaurant.sqlite",
    MENU_UPLOAD_DIR: "/app/data/uploads",
    ORDERING_ENABLED: "false",
    DELIVERY_ENABLED: "false",
    IMPORT_SOURCE_MENU: "true",
    DELIVERY_FEE_PAISE: "",
  };
  assert.doesNotThrow(() => validateRuntime(env));
  for (const changes of [
    { ADMIN_PASSWORD: "short" },
    { APP_ORIGIN: "http://orders.example.com" },
    { APP_ORIGIN: "https://orders.example.com/" },
    { APP_ORIGIN: "https://user:secret@orders.example.com" },
    { DATABASE_PATH: "./data/db.sqlite" },
    { MENU_UPLOAD_DIR: "" },
    { ORDERING_ENABLED: "yes" },
    { IMPORT_SOURCE_MENU: "" },
    { DELIVERY_ENABLED: "true" },
    { DELIVERY_ENABLED: "true", DELIVERY_FEE_PAISE: "-1" },
  ])
    assert.throws(() => validateRuntime({ ...env, ...changes }));
  assert.doesNotThrow(() =>
    validateRuntime({
      ...env,
      DELIVERY_ENABLED: "true",
      DELIVERY_FEE_PAISE: "0",
    }),
  );
});

test("JSON input stops oversized streams and handles UTF-8 across chunk boundaries", async () => {
  const payload = Buffer.from(JSON.stringify({ name: "चिकन" }));
  const stream = new ReadableStream({
    start(c) {
      for (const byte of payload) c.enqueue(new Uint8Array([byte]));
      c.close();
    },
  });
  const request = (body: BodyInit) =>
    new Request("http://localhost", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);
  assert.deepEqual(await readJsonBody(request(stream)), { name: "चिकन" });
  let cancelled = false;
  await assert.rejects(
    readJsonBody(
      request(
        new ReadableStream({
          pull(c) {
            c.enqueue(new Uint8Array(10_000));
          },
          cancel() {
            cancelled = true;
          },
        }),
      ),
    ),
    /Request too large/,
  );
  assert.equal(cancelled, true);
  await assert.rejects(readJsonBody(request("{oops")), /Invalid JSON/);
});

test("backup restores committed WAL data and the corresponding uploaded photo", async () => {
  const directory = await mkdtemp(join(tmpdir(), "restaurant-backup-"));
  const databasePath = join(directory, "live.sqlite");
  const connection = new DatabaseSync(databasePath);
  try {
    connection.exec(
      "PRAGMA journal_mode=WAL; CREATE TABLE orders(id TEXT, photo TEXT); INSERT INTO orders VALUES('order-1','photo.webp');",
    );
    const uploadDirectory = join(directory, "uploads");
    await mkdir(uploadDirectory);
    await writeFile(join(uploadDirectory, "photo.webp"), "photo-fixture");
    const destination = join(directory, "snapshot");
    await backupRestaurant({ databasePath, uploadDirectory, destination });
    const restored = new DatabaseSync(join(destination, "restaurant.sqlite"), {
      readOnly: true,
    });
    try {
      assert.equal(
        restored.prepare("SELECT id FROM orders").get()!.id,
        "order-1",
      );
      assert.equal(
        restored.prepare("PRAGMA integrity_check").get()!.integrity_check,
        "ok",
      );
      assert.equal(
        await readFile(join(destination, "uploads/photo.webp"), "utf8"),
        "photo-fixture",
      );
      assert.equal(
        JSON.parse(await readFile(join(destination, "COMPLETE.json"), "utf8"))
          .version,
        1,
      );
    } finally {
      restored.close();
    }
    await assert.rejects(
      backupRestaurant({ databasePath, uploadDirectory, destination }),
      /EEXIST/,
    );
  } finally {
    connection.close();
    await rm(directory, { recursive: true, force: true });
  }
});
