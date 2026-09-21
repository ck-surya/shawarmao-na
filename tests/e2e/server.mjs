import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
const directory = mkdtempSync(join(tmpdir(), "shawarma-e2e-"));
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3100",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_PATH: join(directory, "test.sqlite"),
      NEXT_DIST_DIR: ".next-e2e",
      ADMIN_PASSWORD: "test-only-staff-password-1234",
      ORDERING_ENABLED: "true",
      DELIVERY_ENABLED: "true",
      DELIVERY_FEE_PAISE: "2500",
      NODE_OPTIONS: [
        process.env.NODE_OPTIONS || "",
        "--require ./tests/e2e/clock.cjs",
      ].join(" "),
    },
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    child.kill(signal);
  });
child.on("exit", (code) => {
  rmSync(directory, { recursive: true, force: true });
  process.exit(code || 0);
});
