import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { importRestaurantMenu } from "../src/lib/menu-import";
import source from "../src/content/restaurant-menu.json";

test("source menu imports once and preserves staff prices and availability on repeat", () => {
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(
      "CREATE TABLE menu_items(id TEXT PRIMARY KEY,data TEXT NOT NULL)",
    );
    assert.deepEqual(importRestaurantMenu(database), {
      inserted: 23,
      retained: 0,
    });
    const first = source.items[0];
    const edited = { ...first, pricePaise: 19900, available: false };
    database
      .prepare("UPDATE menu_items SET data=? WHERE id=?")
      .run(JSON.stringify(edited), first.id);
    assert.deepEqual(importRestaurantMenu(database), {
      inserted: 0,
      retained: 23,
    });
    const row = database
      .prepare("SELECT data FROM menu_items WHERE id=?")
      .get(first.id) as { data: string };
    assert.deepEqual(JSON.parse(row.data), edited);
  } finally {
    database.close();
  }
});
