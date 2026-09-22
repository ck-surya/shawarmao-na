import { db } from "../src/lib/db";
import { importRestaurantMenu } from "../src/lib/menu-import";
const result = importRestaurantMenu(db());
console.log(
  `Menu import: ${result.inserted} items added; ${result.retained} existing items retained.`,
);
