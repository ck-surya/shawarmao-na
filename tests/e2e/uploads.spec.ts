import { test, expect } from "@playwright/test";
import sharp from "sharp";

test("staff can upload, retry, replace and remove a menu photo on mobile", async ({
  page,
  request,
}) => {
  const origin = "http://127.0.0.1:3100";
  const buffer = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "orange" },
  })
    .png()
    .toBuffer();
  const photo = { name: "phone-photo.png", mimeType: "image/png", buffer };
  const item = {
    name: "TEST ONLY uploaded dish",
    description: "Synthetic upload fixture",
    category: "Test uploads",
    pricePaise: 20000,
    image: "",
    dietary: "unspecified",
    available: true,
    verified: true,
  };
  expect(
    (
      await request.post("/api/admin/menu", {
        headers: { Origin: origin },
        multipart: { item: JSON.stringify(item), photo },
      })
    ).status(),
  ).toBe(401);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/menu");
  await page.getByLabel("Staff password").fill("test-only-staff-password-1234");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const staff = page.context().request;
  expect(
    (
      await staff.post("/api/admin/menu", {
        headers: { Origin: "https://untrusted.invalid" },
        multipart: { item: JSON.stringify(item), photo },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await staff.post("/api/admin/menu", {
        headers: { Origin: origin },
        multipart: {
          item: JSON.stringify(item),
          photo: { ...photo, buffer: Buffer.from("not an image") },
        },
      })
    ).status(),
  ).toBe(400);

  await page.getByLabel("Item name", { exact: true }).fill(item.name);
  await page.getByLabel("Category", { exact: true }).fill(item.category);
  await page.getByLabel("Price in rupees").fill("200");
  await page.getByLabel("Owner has verified this item and price").check();
  await page.getByLabel("Menu photo", { exact: true }).setInputFiles(photo);
  await expect(page.getByAltText("Menu photo preview")).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByAltText("Menu photo preview")
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBe(80);
  await page.getByLabel("Menu photo", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/menu-upload-mobile.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.route("**/api/admin/menu", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Test upload interruption" }),
        })
      : route.continue(),
  );
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.locator(".error-box")).toHaveText(
    "Test upload interruption",
  );
  await expect(page.getByLabel("Item name", { exact: true })).toHaveValue(
    item.name,
  );
  await expect(page.getByAltText("Menu photo preview")).toBeVisible();
  await page.unroute("**/api/admin/menu");
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.getByText("Menu item saved.")).toBeVisible();

  const catalog = async () =>
    (await (await request.get("/api/menu")).json()).items;
  const saved = (await catalog()).find(
    (entry: { name: string }) => entry.name === item.name,
  );
  expect(saved.image).toMatch(/^\/images\/uploads\/[a-f0-9-]+\.webp$/);
  const response = await request.get(saved.image);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/webp");
  expect((await sharp(await response.body()).metadata()).width).toBe(80);
  await page.goto("/menu");
  const card = page.locator(".menu-card").filter({
    has: page.getByRole("heading", { name: item.name, exact: true }),
  });
  await card.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      card
        .locator("img")
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: item.name, exact: true }),
  ).toBeVisible();

  await page.goto("/admin/menu");
  await page
    .getByRole("button", { name: `Edit ${item.name}`, exact: true })
    .click();
  await expect(page.getByAltText("Menu photo preview")).toHaveAttribute(
    "src",
    saved.image,
  );
  await page
    .getByLabel("Menu photo", { exact: true })
    .setInputFiles({ ...photo, name: "replacement.png" });
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.getByText("Menu item saved.")).toBeVisible();
  const updated = (await catalog()).find(
    (entry: { id: string }) => entry.id === saved.id,
  );
  expect(updated.image).not.toBe(saved.image);
  await page
    .getByRole("button", { name: `Edit ${item.name}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Remove photo", exact: true }).click();
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.getByText("Menu item saved.")).toBeVisible();
  expect(
    (await catalog()).find((entry: { id: string }) => entry.id === saved.id)
      .image,
  ).toBe("");
  expect((await request.get("/images/uploads/not-a-photo.webp")).status()).toBe(
    404,
  );
});
