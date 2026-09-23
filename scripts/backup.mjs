import { DatabaseSync, backup } from "node:sqlite";
import { cp, mkdir, chmod, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function backupRestaurant({
  databasePath,
  uploadDirectory,
  destination,
}) {
  // Refuse reuse: a failed backup must never look like a previous successful one.
  await mkdir(destination, { mode: 0o700 });
  const connection = new DatabaseSync(databasePath, { readOnly: true });
  try {
    await backup(connection, join(destination, "restaurant.sqlite"));
    await chmod(join(destination, "restaurant.sqlite"), 0o600);
    // Photos are immutable and old photos are retained. Copy after the DB snapshot
    // so every photo referenced by that snapshot is included.
    await cp(uploadDirectory, join(destination, "uploads"), {
      recursive: true,
    });
    await writeFile(
      join(destination, "COMPLETE.json"),
      JSON.stringify({
        completedAt: new Date().toISOString(),
        version: 1,
      }) + "\n",
      { mode: 0o600 },
    );
    return destination;
  } finally {
    connection.close();
  }
}

async function main() {
  const databasePath = resolve(
    process.env.DATABASE_PATH || "./data/restaurant.sqlite",
  );
  const uploadDirectory = resolve(
    process.env.MENU_UPLOAD_DIR || join(dirname(databasePath), "uploads"),
  );
  const root = resolve(
    process.env.BACKUP_DIR || join(dirname(databasePath), "backups"),
  );
  await mkdir(root, { recursive: true, mode: 0o700 });
  const destination = join(root, new Date().toISOString().replaceAll(":", "-"));
  try {
    await backupRestaurant({ databasePath, uploadDirectory, destination });
    console.log(`Backup complete: ${destination}`);
  } catch (error) {
    console.error(
      `Backup failed (${error.code || error.name}); do not restore a folder without COMPLETE.json.`,
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(`Backup failed (${error.code || error.name}).`);
    process.exitCode = 1;
  });
}
