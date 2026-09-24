import type { MenuItem, OrderInput, Status } from "./domain";
export { hash, settings } from "./settings";

export function isCloud() {
  if (process.env.NETLIFY && !process.env.DATABASE_URL)
    throw new Error("Cloud database is not configured");
  return Boolean(process.env.DATABASE_URL);
}
async function adapter() {
  if (isCloud()) {
    const { pg, postgresRepository } = await import("./postgres");
    return postgresRepository(pg());
  }
  const local = await import("./db");
  return {
    ...local,
    hasSession(token: string) {
      return Boolean(
        local
          .db()
          .prepare("SELECT token FROM sessions WHERE token=? AND expires>?")
          .get(token, Date.now()),
      );
    },
    saveSession(token: string, expires: number) {
      local
        .db()
        .prepare("DELETE FROM sessions WHERE expires < ?")
        .run(Date.now());
      local
        .db()
        .prepare("INSERT INTO sessions VALUES(?,?)")
        .run(token, expires);
    },
    deleteSession(token: string) {
      local.db().prepare("DELETE FROM sessions WHERE token=?").run(token);
    },
    health() {
      const db = local.db();
      db.exec("BEGIN IMMEDIATE");
      try {
        db.exec("UPDATE sessions SET expires=expires WHERE 0");
      } finally {
        db.exec("ROLLBACK");
      }
    },
  };
}
export const getMenu = async (all = false) => (await adapter()).getMenu(all);
export const saveMenu = async (item: MenuItem) =>
  (await adapter()).saveMenu(item);
export const createOrder = async (input: OrderInput, clock?: Date) =>
  (await adapter()).createOrder(input, clock);
export const findOrder = async (token: string) =>
  (await adapter()).findOrder(token);
export const listOrders = async () => (await adapter()).listOrders();
export const updateStatus = async (id: string, status: Status) =>
  (await adapter()).updateStatus(id, status);
export const rateLimit = async (key: string, max: number, windowMs: number) =>
  (await adapter()).rateLimit(key, max, windowMs);
export const hasSession = async (token: string) =>
  (await adapter()).hasSession(token);
export const saveSession = async (token: string, expires: number) =>
  (await adapter()).saveSession(token, expires);
export const deleteSession = async (token: string) =>
  (await adapter()).deleteSession(token);
export const databaseHealth = async () => (await adapter()).health();
