// Run after docker build. All writes use a disposable volume and synthetic data.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import sharp from "sharp";

const image = process.argv[2] || "shawarmao-na:stable-test";
const name = `shawarma-smoke-${randomUUID()}`;
const volume = `${name}-data`;
const origin = "https://orders.example.test";
const password = "test-only-deployment-password";
const docker = (...args) =>
  execFileSync("docker", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
let base;
let cookie;
async function ready() {
  // Docker may allocate a different ephemeral host port after a restart.
  base = `http://${docker("port", name, "3000/tcp")}`;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const r = await fetch(`${base}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (r.ok) return;
    } catch {
      /* booting */
    }
    await setTimeout(500);
  }
  throw new Error("Production health check did not become ready");
}
async function json(path, payload, staff = false) {
  const response = await fetch(base + path, {
    method: payload ? "POST" : "GET",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(staff ? { Cookie: cookie } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  assert.equal(response.status, 200, `${path}: ${response.status}`);
  return response.json();
}
try {
  docker("volume", "create", volume);
  docker(
    "run",
    "-d",
    "--name",
    name,
    "-p",
    "127.0.0.1::3000",
    "-v",
    `${volume}:/app/data`,
    "-v",
    `${resolve("tests/e2e/clock.cjs")}:/test-clock.cjs:ro`,
    "-e",
    "NODE_OPTIONS=--require=/test-clock.cjs",
    "-e",
    `ADMIN_PASSWORD=${password}`,
    "-e",
    `APP_ORIGIN=${origin}`,
    "-e",
    "DATABASE_PATH=/app/data/restaurant.sqlite",
    "-e",
    "MENU_UPLOAD_DIR=/app/data/uploads",
    "-e",
    "ORDERING_ENABLED=true",
    "-e",
    "DELIVERY_ENABLED=false",
    "-e",
    "IMPORT_SOURCE_MENU=true",
    image,
  );
  base = `http://${docker("port", name, "3000/tcp")}`;
  await ready();
  assert.equal(docker("exec", name, "id", "-u"), "1000");
  docker(
    "exec",
    name,
    "node",
    "-e",
    "const fs=require('node:fs'); for(const p of ['.env.local','.env.production','outputs','.git']) if(fs.existsSync(p)) process.exit(1)",
  );
  const menu = await json("/api/menu");
  assert.equal(menu.items.length, 23);
  assert.equal(menu.deliveryEnabled, false);
  assert.equal((await fetch(base + "/api/admin/orders")).status, 401);
  const login = await fetch(base + "/api/admin/session", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get("set-cookie");
  assert.match(setCookie, /; Secure/i);
  cookie = setCookie.split(";")[0];
  const form = new FormData();
  form.set("item", JSON.stringify({ ...menu.items[0], pricePaise: 12300 }));
  const photo = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "orange" },
  })
    .png()
    .toBuffer();
  form.set("photo", new File([photo], "phone.png", { type: "image/png" }));
  const upload = await fetch(base + "/api/admin/menu", {
    method: "POST",
    headers: { Origin: origin, Cookie: cookie },
    body: form,
  });
  assert.equal(upload.status, 200);
  const { item } = await upload.json();
  const payload = {
    idempotencyKey: randomUUID(),
    items: [{ id: item.id, quantity: 1 }],
    fulfillment: "pickup",
    name: "Smoke Customer",
    phone: "9876543210",
    address: "",
    notes: "Synthetic deployment test",
  };
  const order = await json("/api/orders", payload);
  assert.deepEqual(await json("/api/orders", payload), order);
  assert.equal(
    (await json("/api/admin/orders", undefined, true)).orders.length,
    1,
  );
  const before = await json(`/api/order/${order.token}`);
  assert.equal(before.total, 12915);
  assert.equal(before.phone, undefined);
  // Backup a live WAL database, then restore into a fresh directory on the test volume.
  docker("exec", name, "node", "scripts/backup.mjs");
  docker("restart", name);
  await ready();
  const after = await json("/api/menu");
  assert.equal(after.items.find((i) => i.id === item.id).pricePaise, 12300);
  assert.equal((await json(`/api/order/${order.token}`)).number, before.number);
  const imageResponse = await fetch(base + item.image);
  assert.equal(imageResponse.status, 200);
  assert.equal(
    (await sharp(Buffer.from(await imageResponse.arrayBuffer())).metadata())
      .width,
    80,
  );
  const optimized = await fetch(
    `${base}/_next/image?url=${encodeURIComponent(item.image)}&w=640&q=75`,
  );
  assert.equal(optimized.status, 200);
  docker("stop", name);
  docker(
    "run",
    "--rm",
    "-v",
    `${volume}:/app/data`,
    image,
    "node",
    "-e",
    `
    const fs=require('node:fs'), path=require('node:path');
    const root='/app/data/backups'; const snapshot=path.join(root,fs.readdirSync(root)[0]);
    if(!fs.existsSync(path.join(snapshot,'COMPLETE.json'))) throw Error('Incomplete backup');
    const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(path.join(snapshot,'restaurant.sqlite'));
    if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') throw Error('Bad backup');
    if(db.prepare('SELECT count(*) AS n FROM orders').get().n!==1) throw Error('Missing order'); db.close();
    for(const suffix of ['', '-wal', '-shm']) fs.rmSync('/app/data/restaurant.sqlite'+suffix,{force:true});
    fs.cpSync(path.join(snapshot,'restaurant.sqlite'),'/app/data/restaurant.sqlite');
    fs.rmSync('/app/data/uploads',{recursive:true,force:true}); fs.cpSync(path.join(snapshot,'uploads'),'/app/data/uploads',{recursive:true});
  `,
  );
  docker("start", name);
  await ready();
  assert.equal((await json(`/api/order/${order.token}`)).number, before.number);
  assert.equal((await fetch(base + item.image)).status, 200);
  console.log(
    "PASS: production startup, menu bootstrap, secure login, phone upload, pickup, duplicate prevention, restart persistence, optimized images and backup restore.",
  );
} finally {
  try {
    docker("rm", "-f", name);
  } catch {
    /* not created */
  }
  try {
    docker("volume", "rm", volume);
  } catch {
    /* not created */
  }
}
