import { readFile } from "node:fs/promises";
import { pg } from "../src/lib/postgres";
import source from "../src/content/restaurant-menu.json";
import { menuSchema } from "../src/lib/domain";
import { storageRequest } from "../src/lib/cloud-storage";

async function main() {
  const sql = pg();
  try {
    await sql.unsafe(
      await readFile(
        new URL("../deploy/postgres.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const candidate of source.items) {
      const item = menuSchema.parse(candidate);
      await sql`INSERT INTO restaurant.menu_items(id,data) VALUES(${item.id!},${JSON.stringify(item)}::text::jsonb) ON CONFLICT(id) DO NOTHING`;
    }
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "menu-photos";
    const current = await storageRequest(
      `bucket/${encodeURIComponent(bucket)}`,
    );
    if (current.status === 404)
      await storageRequest("bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bucket,
          name: bucket,
          public: false,
          file_size_limit: 5 * 1024 * 1024,
          allowed_mime_types: ["image/webp"],
        }),
      });
    console.log(
      "Cloud schema, source menu and private photo bucket are ready.",
    );
  } finally {
    await sql.end();
  }
}
main().catch((error) => {
  console.error("Cloud setup failed", error.code || error.name);
  process.exitCode = 1;
});
