import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { postgresRepository } from "../src/lib/postgres";
import type { MenuItem, OrderInput } from "../src/lib/domain";

test("Postgres: concurrent idempotency, audited status updates, sessions and atomic rate limits", async () => {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error("Set TEST_DATABASE_URL to a disposable database");
  const sql = postgres(process.env.TEST_DATABASE_URL, {
    max: 5,
    prepare: false,
    onnotice: () => {},
  });
  const repo = postgresRepository(sql);
  const open = new Date("2026-09-22T10:00:00Z");
  const item: MenuItem = {
    id: randomUUID(),
    name: "TEST ONLY",
    description: "Synthetic fixture",
    category: "Testing",
    pricePaise: 10000,
    available: true,
    verified: true,
    dietary: "unspecified",
    image: "",
  };
  const input: OrderInput = {
    idempotencyKey: randomUUID(),
    items: [{ id: item.id, quantity: 2 }],
    fulfillment: "pickup",
    name: "Test Customer",
    phone: "9876543210",
    address: "",
    notes: "",
  };
  const previous = { ...process.env };
  process.env.ORDERING_ENABLED = "true";
  process.env.DELIVERY_ENABLED = "false";
  try {
    const migration = await sql.reserve();
    try {
      await migration.unsafe(
        await readFile(
          new URL("../deploy/postgres.sql", import.meta.url),
          "utf8",
        ),
      );
    } finally {
      await migration.release();
    }
    await repo.saveMenu(item);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => repo.createOrder(input, open)),
    );
    assert.equal(new Set(results.map((r) => r.token)).size, 1);
    const order = await repo.findOrder(results[0].token);
    assert.equal(order.total, 21000);
    assert.equal(order.history.length, 1);
    assert.equal("phone" in order, false);
    await assert.rejects(
      repo.createOrder({ ...input, name: "Changed" }, open),
      /checkout has changed/,
    );
    await assert.rejects(
      repo.createOrder(
        {
          ...input,
          idempotencyKey: randomUUID(),
          fulfillment: "delivery",
          address: "Synthetic address",
        },
        open,
      ),
      /Delivery is not available/,
    );
    await assert.rejects(
      repo.updateStatus(order.id, "delivered"),
      /transition/,
    );
    const transitions = await Promise.allSettled([
      repo.updateStatus(order.id, "confirmed"),
      repo.updateStatus(order.id, "confirmed"),
    ]);
    assert.equal(transitions.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await repo.findOrder(results[0].token)).history.length, 2);
    await repo.saveMenu({ ...item, available: false });
    await assert.rejects(
      repo.createOrder({ ...input, idempotencyKey: randomUUID() }, open),
      /no longer available/,
    );
    await repo.saveMenu(item);
    await assert.rejects(
      repo.createOrder(
        {
          ...input,
          idempotencyKey: randomUUID(),
          items: [...input.items, ...input.items],
        },
        open,
      ),
      /Duplicate/,
    );
    await assert.rejects(
      repo.createOrder(
        { ...input, idempotencyKey: randomUUID() },
        new Date("2026-09-22T01:00:00Z"),
      ),
      /closed/,
    );
    process.env.ORDERING_ENABLED = "false";
    await assert.rejects(
      repo.createOrder({ ...input, idempotencyKey: randomUUID() }, open),
      /not available/,
    );
    const key = randomUUID();
    const limits = await Promise.allSettled(
      Array.from({ length: 8 }, () => repo.rateLimit(key, 3, 60000)),
    );
    assert.equal(limits.filter((r) => r.status === "fulfilled").length, 3);
    await sql`UPDATE restaurant.rate_limits SET expires=0 WHERE key=${key}`;
    await repo.rateLimit(key, 3, 60000);
    const token = randomUUID();
    await repo.saveSession(token, Date.now() + 60000);
    assert.equal(await repo.hasSession(token), true);
    await repo.deleteSession(token);
    assert.equal(await repo.hasSession(token), false);
    const [counts] =
      await sql`SELECT count(*)::int AS n FROM restaurant.orders WHERE request_key=${input.idempotencyKey}`;
    assert.equal(counts.n, 1);
    // Tables are protected even if someone later adds the private schema to the Data API.
    const rows =
      await sql`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname='restaurant' AND c.relkind='r'`;
    assert.ok(rows.every((row) => row.relrowsecurity));
  } finally {
    process.env.ORDERING_ENABLED = previous.ORDERING_ENABLED;
    process.env.DELIVERY_ENABLED = previous.DELIVERY_ENABLED;
    await sql.end({ timeout: 5 });
  }
});
