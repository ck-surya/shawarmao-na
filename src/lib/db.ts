import menuSource from "../content/restaurant-menu.json";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  AppError,
  calculateItems,
  calculateTotals,
  isOpen,
  nextStates,
  type MenuItem,
  type Order,
  type OrderInput,
  type Status,
} from "./domain";
let database: DatabaseSync;
export function db() {
  if (database) return database;
  const path = resolve(
    /* turbopackIgnore: true */ process.env.DATABASE_PATH ||
      "./data/restaurant.sqlite",
  );
  mkdirSync(dirname(path), { recursive: true });
  database = new DatabaseSync(path);
  database.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, number TEXT UNIQUE NOT NULL, token TEXT UNIQUE NOT NULL, request_key TEXT UNIQUE NOT NULL, request_hash TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS order_status_history (id INTEGER PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), status TEXT NOT NULL, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  return database;
}
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export function getMenu(all = false): MenuItem[] {
  return (
    db().prepare("SELECT data FROM menu_items ORDER BY rowid").all() as {
      data: string;
    }[]
  )
    .map((r) => JSON.parse(r.data))
    .filter((i) => all || i.verified);
}
export function saveMenu(item: MenuItem) {
  db()
    .prepare(
      "INSERT INTO menu_items(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
    )
    .run(item.id, JSON.stringify(item));
}
export function settings() {
  const fee = process.env.DELIVERY_FEE_PAISE;
  return {
    orderingEnabled: process.env.ORDERING_ENABLED === "true",
    taxRateBps: menuSource.taxRateBps,
    deliveryEnabled:
      process.env.DELIVERY_ENABLED === "true" &&
      !!fee &&
      /^\d+$/.test(fee) &&
      Number(fee) <= 100000,
    deliveryFee: fee && /^\d+$/.test(fee) ? Number(fee) : null,
  };
}
function transaction<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    d.exec("COMMIT");
    return result;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function createOrder(input: OrderInput, clock = new Date()) {
  return transaction(() => {
    const requestHash = hash(JSON.stringify(input));
    const previous = db()
      .prepare("SELECT token,request_hash FROM orders WHERE request_key=?")
      .get(input.idempotencyKey) as
      { token: string; request_hash: string } | undefined;
    if (previous) {
      if (previous.request_hash !== requestHash)
        throw new AppError(
          "This checkout has changed. Start a new checkout.",
          409,
        );
      return { token: previous.token };
    }
    const config = settings();
    if (!config.orderingEnabled)
      throw new AppError(
        "Online ordering is not available yet. Please call the restaurant.",
        503,
      );
    if (!isOpen(clock))
      throw new AppError(
        "The restaurant is closed. Orders open at 12 PM.",
        409,
      );
    if (input.fulfillment === "delivery" && !config.deliveryEnabled)
      throw new AppError("Delivery is not available. Choose pickup.", 409);
    const items = calculateItems(input.items, getMenu());
    const subtotal = items.reduce(
      (sum, i) => sum + i.pricePaise * i.quantity,
      0,
    );
    const deliveryFee =
      input.fulfillment === "delivery" ? config.deliveryFee! : 0;
    const id = randomUUID(),
      token = randomBytes(32).toString("hex"),
      now = new Date().toISOString();
    const order: Order = {
      id,
      number: `SN-${randomBytes(6).toString("hex").toUpperCase()}`,
      status: "pending",
      fulfillment: input.fulfillment,
      name: input.name,
      phone: input.phone,
      address: input.fulfillment === "delivery" ? input.address : "",
      notes: input.notes,
      ...calculateTotals(subtotal, deliveryFee, config.taxRateBps),
      paymentStatus: "unpaid",
      createdAt: now,
      items,
      history: [],
    };
    db()
      .prepare("INSERT INTO orders VALUES(?,?,?,?,?,?)")
      .run(
        id,
        order.number,
        token,
        input.idempotencyKey,
        requestHash,
        JSON.stringify(order),
      );
    db()
      .prepare(
        "INSERT INTO order_status_history(order_id,status,at) VALUES(?,?,?)",
      )
      .run(id, "pending", now);
    return { token };
  });
}
function hydrate(row: { data: string }): Order {
  const order: Order = { tax: 0, taxRateBps: 0, ...JSON.parse(row.data) };
  order.history = db()
    .prepare(
      "SELECT status,at FROM order_status_history WHERE order_id=? ORDER BY id",
    )
    .all(order.id) as Order["history"];
  return order;
}
export function findOrder(token: string) {
  const row = db()
    .prepare("SELECT data FROM orders WHERE token=?")
    .get(token) as { data: string } | undefined;
  if (!row) throw new AppError("Order not found", 404);
  const { name, phone, address, notes, ...safe } = hydrate(row);
  void name;
  void phone;
  void address;
  void notes;
  return safe;
}
export function listOrders() {
  return (
    db()
      .prepare("SELECT data FROM orders ORDER BY rowid DESC LIMIT 200")
      .all() as { data: string }[]
  ).map(hydrate);
}
export function updateStatus(id: string, status: Status) {
  return transaction(() => {
    const row = db().prepare("SELECT data FROM orders WHERE id=?").get(id) as
      { data: string } | undefined;
    if (!row) throw new AppError("Order not found", 404);
    const order = hydrate(row);
    if (!nextStates(order.status, order.fulfillment).includes(status))
      throw new AppError(
        "This status transition is not allowed. Refresh the order.",
        409,
      );
    order.status = status;
    order.history = [];
    db()
      .prepare("UPDATE orders SET data=? WHERE id=?")
      .run(JSON.stringify(order), id);
    db()
      .prepare(
        "INSERT INTO order_status_history(order_id,status,at) VALUES(?,?,?)",
      )
      .run(id, status, new Date().toISOString());
  });
}
export function rateLimit(key: string, max: number, windowMs: number) {
  transaction(() => {
    const now = Date.now();
    db().prepare("DELETE FROM rate_limits WHERE expires < ?").run(now);
    const row = db()
      .prepare("SELECT count FROM rate_limits WHERE key=?")
      .get(key) as { count: number } | undefined;
    if (row && row.count >= max)
      throw new AppError("Too many attempts. Please try again later.", 429);
    db()
      .prepare(
        "INSERT INTO rate_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
      )
      .run(key, now + windowMs);
  });
}
