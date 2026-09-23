import { mkdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { validateRuntime } from "./runtime-config.mjs";

try {
  validateRuntime(process.env);
  for (const path of [
    dirname(process.env.DATABASE_PATH),
    process.env.MENU_UPLOAD_DIR,
  ]) {
    await mkdir(path, { recursive: true });
    await access(path, constants.W_OK);
  }
} catch (error) {
  console.error(`Production startup refused: ${error.message}`);
  process.exit(1);
}
await import("../server.js");
