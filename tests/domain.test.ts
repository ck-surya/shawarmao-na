import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isOpen,
  calculateTotals,
  nextStates,
  orderSchema,
  calculateItems,
  type MenuItem,
} from "../src/lib/domain";
test("opening hours cross midnight in India, with exact boundaries", () => {
  for (const [time, expected] of [
    ["06:29:59", false],
    ["06:30:00", true],
    ["18:30:00", true],
    ["23:29:59", true],
    ["23:30:00", false],
  ] as const)
    assert.equal(isOpen(new Date(`2026-09-22T${time}Z`)), expected, time);
});
test("pickup skips delivery and terminal statuses cannot advance", () => {
  assert.deepEqual(nextStates("ready", "pickup"), ["delivered", "cancelled"]);
  assert.deepEqual(nextStates("delivered", "pickup"), []);
  assert.ok(nextStates("ready", "delivery").includes("out_for_delivery"));
});
const id = "84646e39-252c-4cf0-9e36-28bca403df09";
const item: MenuItem = {
  id,
  name: "TEST ITEM",
  description: "Fixture only",
  category: "Test",
  pricePaise: 12500,
  available: true,
  verified: true,
  dietary: "unspecified",
  image: "",
};
test("authoritative prices and unavailable or duplicate items", () => {
  assert.equal(
    calculateItems([{ id, quantity: 2 }], [item])[0].pricePaise,
    12500,
  );
  assert.throws(() =>
    calculateItems([{ id, quantity: 2 }], [{ ...item, available: false }]),
  );
  assert.throws(() =>
    calculateItems([{ id, quantity: 2 }], [{ ...item, verified: false }]),
  );
  assert.throws(() =>
    calculateItems(
      [
        { id, quantity: 2 },
        { id, quantity: 1 },
      ],
      [item],
    ),
  );
});
test("checkout rejects client prices, fractional quantities and missing delivery address", () => {
  const input = {
    idempotencyKey: id,
    items: [{ id, quantity: 1 }],
    fulfillment: "pickup",
    name: "Test Person",
    phone: "9876543210",
  };
  assert.ok(orderSchema.safeParse(input).success);
  assert.equal(orderSchema.safeParse({ ...input, total: 1 }).success, false);
  assert.equal(
    orderSchema.safeParse({ ...input, fulfillment: "delivery" }).success,
    false,
  );
  assert.equal(
    orderSchema.safeParse({ ...input, items: [{ id, quantity: 1.5 }] }).success,
    false,
  );
});

test("menu GST is rounded to paise once and kept separate from delivery", () => {
  assert.deepEqual(calculateTotals(19000, 0, 500), {
    subtotal: 19000,
    deliveryFee: 0,
    taxRateBps: 500,
    tax: 950,
    total: 19950,
  });
  assert.equal(calculateTotals(10010, 2500, 500).tax, 501);
  assert.equal(calculateTotals(10010, 2500, 500).total, 13011);
  assert.equal(calculateTotals(10010, 0, 0).total, 10010);
});
