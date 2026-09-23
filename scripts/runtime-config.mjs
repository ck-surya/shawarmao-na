import { isAbsolute } from "node:path";

export function validateRuntime(env) {
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 16)
    throw new Error("ADMIN_PASSWORD must have at least 16 characters.");
  let origin;
  try {
    origin = new URL(env.APP_ORIGIN);
  } catch {
    /* handled below */
  }
  if (
    !origin ||
    origin.protocol !== "https:" ||
    origin.origin !== env.APP_ORIGIN
  )
    throw new Error(
      "APP_ORIGIN must be an HTTPS origin without a path or trailing slash.",
    );
  for (const key of ["DATABASE_PATH", "MENU_UPLOAD_DIR"])
    if (!env[key] || !isAbsolute(env[key]))
      throw new Error(`${key} must be an absolute path on persistent storage.`);
  for (const key of [
    "ORDERING_ENABLED",
    "DELIVERY_ENABLED",
    "IMPORT_SOURCE_MENU",
  ])
    if (!["true", "false"].includes(env[key]))
      throw new Error(`${key} must be explicitly true or false.`);
  if (
    env.DELIVERY_ENABLED === "true" &&
    (!/^\d+$/.test(env.DELIVERY_FEE_PAISE || "") ||
      Number(env.DELIVERY_FEE_PAISE) > 100000)
  )
    throw new Error(
      "DELIVERY_FEE_PAISE must be an integer from 0 to 100000 when delivery is enabled.",
    );
}
