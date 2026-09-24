import source from "../content/restaurant-menu.json";
import { createHash } from "node:crypto";

export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function settings() {
  const fee = process.env.DELIVERY_FEE_PAISE;
  return {
    orderingEnabled: process.env.ORDERING_ENABLED === "true",
    taxRateBps: source.taxRateBps,
    deliveryEnabled:
      process.env.DELIVERY_ENABLED === "true" &&
      !!fee &&
      /^\d+$/.test(fee) &&
      Number(fee) <= 100000,
    deliveryFee: fee && /^\d+$/.test(fee) ? Number(fee) : null,
  };
}
