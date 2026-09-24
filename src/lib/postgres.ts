import postgres, { type Sql } from "postgres";
import { randomBytes, randomUUID } from "node:crypto";
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
import { hash, settings } from "./settings";

let connection: Sql;
export function pg() {
  if (!connection) {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is required for cloud persistence");
    connection = postgres(process.env.DATABASE_URL, {
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: {
        rejectUnauthorized: true,
        ...(process.env.DATABASE_CA_CERT
          ? { ca: process.env.DATABASE_CA_CERT.replaceAll("\\n", "\n") }
          : {}),
      },
      connection: { statement_timeout: 15000 },
    });
  }
  return connection;
}

// Inject a database connection so concurrency/transaction tests use real Postgres.
export function postgresRepository(sql: Sql) {
  return {
    async getMenu(all = false): Promise<MenuItem[]> {
      const rows =
        await sql`SELECT data FROM restaurant.menu_items ORDER BY ordinal`;
      return rows
        .map((row) => row.data as MenuItem)
        .filter((item) => all || item.verified);
    },
    async saveMenu(item: MenuItem) {
      await sql`INSERT INTO restaurant.menu_items(id,data) VALUES(${item.id},${JSON.stringify(item)}::text::jsonb)
        ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
    },
    async createOrder(input: OrderInput, clock = new Date()) {
      return sql.begin(async (tx) => {
        // Transaction-scoped lock works with Supabase's transaction pooler.
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${input.idempotencyKey},0))`;
        const requestHash = hash(JSON.stringify(input));
        const [previous] =
          await tx`SELECT token,request_hash FROM restaurant.orders WHERE request_key=${input.idempotencyKey}`;
        if (previous) {
          if (previous.request_hash !== requestHash)
            throw new AppError(
              "This checkout has changed. Start a new checkout.",
              409,
            );
          return { token: previous.token as string };
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
        const rows =
          await tx`SELECT data FROM restaurant.menu_items WHERE id IN ${tx(input.items.map((item) => item.id))} ORDER BY id FOR SHARE`;
        const items = calculateItems(
          input.items,
          rows.map((row) => row.data as MenuItem),
        );
        const subtotal = items.reduce(
          (sum, item) => sum + item.pricePaise * item.quantity,
          0,
        );
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
          ...calculateTotals(
            subtotal,
            input.fulfillment === "delivery" ? config.deliveryFee! : 0,
            config.taxRateBps,
          ),
          paymentStatus: "unpaid",
          createdAt: now,
          items,
          history: [],
        };
        await tx`INSERT INTO restaurant.orders(id,number,token,request_key,request_hash,data)
          VALUES(${id},${order.number},${token},${input.idempotencyKey},${requestHash},${JSON.stringify(order)}::text::jsonb)`;
        await tx`INSERT INTO restaurant.order_status_history(order_id,status,at) VALUES(${id},'pending',${now})`;
        return { token };
      });
    },
    async findOrder(token: string) {
      const [row] =
        await sql`SELECT o.data, coalesce((SELECT jsonb_agg(jsonb_build_object('status',h.status,'at',h.at) ORDER BY h.id)
        FROM restaurant.order_status_history h WHERE h.order_id=o.id),'[]'::text::jsonb) AS history
        FROM restaurant.orders o WHERE o.token=${token}`;
      if (!row) throw new AppError("Order not found", 404);
      const { name, phone, address, notes, ...safe }: Order = {
        tax: 0,
        taxRateBps: 0,
        ...row.data,
        history: row.history,
      };
      void name;
      void phone;
      void address;
      void notes;
      return safe;
    },
    async listOrders(): Promise<Order[]> {
      const rows =
        await sql`SELECT o.data, coalesce((SELECT jsonb_agg(jsonb_build_object('status',h.status,'at',h.at) ORDER BY h.id)
        FROM restaurant.order_status_history h WHERE h.order_id=o.id),'[]'::text::jsonb) AS history
        FROM restaurant.orders o ORDER BY o.ordinal DESC LIMIT 200`;
      return rows.map((row) => ({
        tax: 0,
        taxRateBps: 0,
        ...row.data,
        history: row.history,
      }));
    },
    async updateStatus(id: string, status: Status) {
      await sql.begin(async (tx) => {
        const [row] =
          await tx`SELECT data FROM restaurant.orders WHERE id=${id} FOR UPDATE`;
        if (!row) throw new AppError("Order not found", 404);
        const order = row.data as Order;
        if (!nextStates(order.status, order.fulfillment).includes(status))
          throw new AppError(
            "This status transition is not allowed. Refresh the order.",
            409,
          );
        await tx`UPDATE restaurant.orders SET data=${JSON.stringify({ ...order, status, history: [] })}::text::jsonb WHERE id=${id}`;
        await tx`INSERT INTO restaurant.order_status_history(order_id,status,at) VALUES(${id},${status},${new Date().toISOString()})`;
      });
    },
    async rateLimit(key: string, max: number, windowMs: number) {
      const now = Date.now();
      const rows =
        await sql`INSERT INTO restaurant.rate_limits(key,count,expires) VALUES(${key},1,${now + windowMs})
        ON CONFLICT(key) DO UPDATE SET
          count=CASE WHEN restaurant.rate_limits.expires<=${now} THEN 1 ELSE restaurant.rate_limits.count+1 END,
          expires=CASE WHEN restaurant.rate_limits.expires<=${now} THEN excluded.expires ELSE restaurant.rate_limits.expires END
        WHERE restaurant.rate_limits.expires<=${now} OR restaurant.rate_limits.count<${max} RETURNING key`;
      if (!rows.length)
        throw new AppError("Too many attempts. Please try again later.", 429);
    },
    async hasSession(token: string) {
      const rows =
        await sql`SELECT token FROM restaurant.sessions WHERE token=${token} AND expires>${Date.now()}`;
      return rows.length > 0;
    },
    async saveSession(token: string, expires: number) {
      await sql`DELETE FROM restaurant.sessions WHERE expires<${Date.now()}`;
      await sql`INSERT INTO restaurant.sessions(token,expires) VALUES(${token},${expires})`;
    },
    async deleteSession(token: string) {
      await sql`DELETE FROM restaurant.sessions WHERE token=${token}`;
    },
    async health() {
      await sql`SELECT 1 FROM restaurant.menu_items LIMIT 1`;
    },
  };
}
