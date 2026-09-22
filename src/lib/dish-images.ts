import type { MenuItem } from "./domain";

// Match both ID and name, so renaming a dish cannot leave misleading artwork.
const illustrations: Record<string, { name: string; file: string }> = {
  "e26789d6-3837-51d0-a08a-e99c1cd269e4": {
    name: "Chicken Shawarma",
    file: "chicken-shawarma",
  },
  "bf25d79c-8e45-5e3b-8449-02c0854515ea": {
    name: "Paneer Shawarma",
    file: "paneer-shawarma",
  },
  "286c22eb-a479-5cb1-8577-f8c0bd9e9c81": {
    name: "Falafel Shawarma",
    file: "falafel-shawarma",
  },
  "8686afce-fa5f-5811-a99d-756a66098d41": {
    name: "Hummus - Pita",
    file: "hummus-pita",
  },
  "3925449b-1df7-5ef4-a31e-4403a18d135a": {
    name: "Hummus - Falafel",
    file: "hummus-falafel",
  },
  "3322af2b-782b-5102-a939-8744c7251125": {
    name: "Chicken Platter",
    file: "chicken-platter",
  },
  "d141b7f2-e76b-5549-9efc-7ac1ef2cb0c8": {
    name: "Paneer Platter",
    file: "paneer-platter",
  },
  "fd050d39-60ff-568d-ad19-79c4dc31a885": {
    name: "Doner Chicken Bowl",
    file: "doner-chicken-bowl",
  },
  "0ad36e20-d96e-5032-bb89-1344cc898573": {
    name: "Steam Momos (Chicken)",
    file: "steam-momos",
  },
  "ccd9fc41-dbb1-5882-ae4e-824035d2994c": {
    name: "Steam Momos (Veg)",
    file: "steam-momos",
  },
  "d8bdd572-31bf-5bbe-bd57-fdb0536599ec": {
    name: "Fried Momos (Chicken)",
    file: "fried-momos",
  },
  "761cc082-a493-5472-943a-f894b9b9ddad": {
    name: "Fried Momos (Veg)",
    file: "fried-momos",
  },
  "2247fcf6-dd11-5056-ae8c-cc468463148b": {
    name: "Peri Peri Momos (Chicken)",
    file: "peri-peri-momos",
  },
  "9e7477c8-5bb3-5b5c-b238-56b257512455": {
    name: "Peri Peri Momos (Veg)",
    file: "peri-peri-momos",
  },
  "94d4091f-aafd-5da5-8947-b3459c8cf696": {
    name: "Kurkure Momos (Chicken)",
    file: "kurkure-momos",
  },
  "459ae3e3-6243-581d-a36e-c6016fefc93d": {
    name: "Kurkure Momos (Veg)",
    file: "kurkure-momos",
  },
  "321078c8-e8ec-5181-b91c-2395cac92c85": {
    name: "Wheat Steam Momos (Chicken)",
    file: "wheat-steam-momos",
  },
  "807ed4b2-2a68-5ea4-afac-56cdaac1d798": {
    name: "Wheat Steam Momos (Veg)",
    file: "wheat-steam-momos",
  },
  "4691f52d-62c0-54c1-b38e-f3c38f752fb0": {
    name: "French Fries",
    file: "french-fries",
  },
  "f1688b57-315e-537e-ab0f-c9dd2a57e229": {
    name: "Peri Peri Fries",
    file: "peri-peri-fries",
  },
  "6a204bc6-138c-5572-b1f2-1509e78af1d7": {
    name: "Veg Spring Rolls",
    file: "veg-spring-rolls",
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
