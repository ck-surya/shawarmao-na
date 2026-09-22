import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  createOrder,
  findOrder,
  listOrders,
  saveMenu,
  updateStatus,
  rateLimit,
  db,
} from "../src/lib/db";
import type { MenuItem, OrderInput } from "../src/lib/domain";
const directory = mkdtempSync(join(tmpdir(), "shawarma-unit-"));
process.env.DATABASE_PATH = join(directory, "test.sqlite");
process.env.ORDERING_ENABLED = "true";
process.env.DELIVERY_ENABLED = "true";
process.env.DELIVERY_FEE_PAISE = "2500";
const item: MenuItem = {
  id: randomUUID(),
  name: "TEST ONLY",
  description: "Synthetic test fixture",
  category: "Testing",
  pricePaise: 10000,
  available: true,
  verified: true,
  dietary: "unspecified",
  image: "",
};
const input = (): OrderInput => ({
  idempotencyKey: randomUUID(),
  items: [{ id: item.id, quantity: 2 }],
  fulfillment: "pickup",
  name: "Test Customer",
  phone: "9876543210",
  address: "",
  notes: "",
});
const open = new Date("2026-09-22T10:00:00Z");
test("transactional order persistence, idempotency, private tracking, and audited transitions", () => {
  saveMenu(item);
  const request = input();
  const result = createOrder(request, open);
  assert.equal(createOrder(request, open).token, result.token);
  assert.equal(listOrders().length, 1);
  const order = findOrder(result.token);
  assert.equal(order.total, 21000);
  assert.equal(order.tax, 1000);
  assert.equal(order.taxRateBps, 500);
  assert.equal(order.paymentStatus, "unpaid");
  assert.equal("phone" in order, false);
  assert.equal("name" in order, false);
  assert.equal("address" in order, false);
  assert.equal(order.history.length, 1);
  assert.throws(
    () => createOrder({ ...request, name: "Someone else" }, open),
    /checkout has changed/,
  );
  assert.throws(() => updateStatus(order.id, "delivered"), /transition/);
  for (const status of [
    "confirmed",
    "preparing",
    "ready",
    "delivered",
  ] as const)
    updateStatus(order.id, status);
  assert.equal(findOrder(result.token).history.length, 5);
  assert.equal(findOrder(result.token).status, "delivered");
  assert.throws(() => updateStatus(order.id, "cancelled"));
});
test("delivery fee, unavailable items, closed hours, and disabled ordering enforced on server", () => {
  const delivery = {
    ...input(),
    fulfillment: "delivery" as const,
    address: "Synthetic test address",
  };
  const order = findOrder(createOrder(delivery, open).token);
  assert.equal(order.deliveryFee, 2500);
  assert.equal(order.total, 23500);
  saveMenu({ ...item, available: false });
  assert.throws(() => createOrder(input(), open), /no longer available/);
  saveMenu(item);
  assert.throws(
    () => createOrder(input(), new Date("2026-09-22T01:00:00Z")),
    /closed/,
  );
  process.env.ORDERING_ENABLED = "false";
  assert.throws(() => createOrder(input(), open), /not available/);
  process.env.ORDERING_ENABLED = "true";
  process.env.DELIVERY_FEE_PAISE = "";
  assert.throws(
    () => createOrder({ ...delivery, idempotencyKey: randomUUID() }, open),
    /Delivery is not available/,
  );
  assert.equal(listOrders().length, 2);
});
test("legacy order snapshots retain original totals without retroactive GST", () => {
  const existing = listOrders()[0];
  const { tax, taxRateBps, ...legacy } = existing;
  void tax;
  void taxRateBps;
  const originalTotal = legacy.total;
  db()
    .prepare("UPDATE orders SET data=? WHERE id=?")
    .run(JSON.stringify(legacy), legacy.id);
  const restored = listOrders().find((order) => order.id === legacy.id)!;
  assert.equal(restored.tax, 0);
  assert.equal(restored.taxRateBps, 0);
  assert.equal(restored.total, originalTotal);
});
test("rate limits stop repeated attempts", () => {
  rateLimit("test", 1, 60000);
  assert.throws(() => rateLimit("test", 1, 60000), /Too many attempts/);
});
process.on("exit", () => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});
