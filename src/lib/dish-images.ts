import type { MenuItem } from "./domain";

// Match both ID and name, so renaming a dish cannot leave misleading artwork.
const illustrations: Record<string, { name: string; file: string }> = {
  "e26789d6-3837-51d0-a08a-e99c1cd269e4": {
    name: "Chicken Shawarma",
    file: "chicken-shawarma",
  },
  "8686afce-fa5f-5811-a99d-756a66098d41": {
    name: "Hummus - Pita",
    file: "hummus-pita",
  },
  "0ad36e20-d96e-5032-bb89-1344cc898573": {
    name: "Steam Momos (Chicken)",
    file: "steam-momos",
  },
  "ccd9fc41-dbb1-5882-ae4e-824035d2994c": {
    name: "Steam Momos (Veg)",
    file: "steam-momos",
  },
  "4691f52d-62c0-54c1-b38e-f3c38f752fb0": {
    name: "French Fries",
    file: "french-fries",
  },
  "6860a92f-39d7-5c36-89fe-1c1c5c55d40b": {
    name: "Choco Lava Cake",
    file: "choco-lava-cake",
  },
  "0c09db16-a2ab-551d-8a30-837a6108102f": {
    name: "Walnut Brownie",
    file: "walnut-brownie",
  },
};
export function dishImage(item: Pick<MenuItem, "id" | "name" | "image">) {
  if (item.image) return { src: item.image, illustration: false };
  const entry = illustrations[item.id];
  return entry?.name === item.name
    ? {
        src: `/images/dishes/${entry.file}-illustration.webp`,
        illustration: true,
      }
    : null;
}
