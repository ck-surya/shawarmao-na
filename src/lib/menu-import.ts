import type { DatabaseSync } from "node:sqlite";
import source from "../content/restaurant-menu.json";
import { menuSchema } from "./domain";

// Stable source IDs make repeated imports safe. Staff edits always win.
export function importRestaurantMenu(database: DatabaseSync) {
  const items = source.items.map((item) => menuSchema.parse(item));
  database.exec("BEGIN IMMEDIATE");
  try {
    const insert = database.prepare(
      "INSERT OR IGNORE INTO menu_items(id,data) VALUES(?,?)",
    );
    let inserted = 0;
    for (const item of items) {
      inserted += Number(insert.run(item.id!, JSON.stringify(item)).changes);
    }
    database.exec("COMMIT");
    return { inserted, retained: items.length - inserted };
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
