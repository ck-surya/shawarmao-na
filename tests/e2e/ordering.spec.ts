import sourceMenu from "../../src/content/restaurant-menu.json";
import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3100";
const password = "test-only-staff-password-1234";
test("empty storefront, responsive layouts, protected APIs and recoverable menu error", async ({
  page,
  request,
}) => {
  expect((await request.get("/api/admin/orders")).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin/session", {
        data: { password },
        headers: { Origin: "https://not-our-site.invalid" },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Our menu is on its way." }),
  ).toBeVisible();
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.screenshot({
    path: "test-results/storefront-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/storefront-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: /Open bag/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.route("**/api/menu", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Test outage" }),
    }),
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "We couldn’t load the menu." }),
  ).toBeVisible();
  await page.unroute("**/api/menu");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Our menu is on its way." }),
  ).toBeVisible();
});
test("staff menu setup, guest pickup, persisted tracking, status progression and delivery", async ({
  page,
  request,
  browser,
}) => {
  await page.goto("/admin/menu");
  await page.getByLabel("Staff password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Item name", { exact: true }).fill("TEST ONLY wrap");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Synthetic automated test fixture");
  await page.getByLabel("Category", { exact: true }).fill("Test menu");
  await page.getByLabel("Price in rupees").fill("125");
  await page.getByLabel("Owner has verified this item and price").check();
  await page.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(page.getByText("Menu item saved.")).toBeVisible();
  const menu = await (await request.get("/api/menu")).json();
  const id = menu.items[0].id;
  const itemData = { id, quantity: 2 };
  const payload = {
    idempotencyKey: crypto.randomUUID(),
    items: [itemData],
    fulfillment: "delivery",
    name: "Test Customer",
    phone: "9876543210",
    address: "Synthetic test address",
    notes: "",
  };
  expect(
    (
      await request.post("/api/orders", {
        headers: { Origin: origin },
        data: { ...payload, total: 1 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/orders", {
        headers: { Origin: origin },
        data: { ...payload, items: [{ id: crypto.randomUUID(), quantity: 1 }] },
      })
    ).status(),
  ).toBe(409);
  const customer = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const shop = await customer.newPage();
  await shop.goto("/menu");
  await shop
    .getByRole("button", { name: "Add TEST ONLY wrap", exact: true })
    .click();
  await shop.reload();
  await shop.getByRole("button", { name: "View bag" }).click();
  await expect(shop.getByRole("dialog")).toBeVisible();
  await shop.getByRole("link", { name: "Continue to checkout" }).click();
  await shop.getByLabel("Your name").fill("Test Customer");
  await shop.getByLabel("Mobile number").fill("9876543210");
  await shop.getByRole("button", { name: "Place order" }).click();
  await expect(shop).toHaveURL(/\/order\/[a-f0-9]{64}$/);
  await expect(
    shop.getByRole("heading", { name: "Your order is with us." }),
  ).toBeVisible();
  const token = shop.url().split("/").pop();
  const order = await (await request.get(`/api/order/${token}`)).json();
  expect(order.total).toBe(13125);
  expect(order.tax).toBe(625);
  expect(order.phone).toBeUndefined();
  expect(order.address).toBeUndefined();
  await shop.reload();
  await expect(shop.getByText(order.number, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Orders", exact: true }).click();
  await expect(page.getByRole("heading", { name: order.number })).toBeVisible();
  await page.getByRole("button", { name: "Accept order" }).click();
  await expect(
    page.getByText("Confirmed", { exact: true }).first(),
  ).toBeVisible();
  for (const label of ["Mark preparing", "Mark ready", "Mark completed"]) {
    const card = page
      .locator("details")
      .filter({ has: page.getByRole("heading", { name: order.number }) });
    if (!(await card.evaluate((node) => node.hasAttribute("open"))))
      await card.locator("summary").click();
    const saved = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/order-status") &&
        response.request().method() === "POST",
    );
    await card.getByRole("button", { name: label, exact: true }).click();
    expect((await saved).ok()).toBeTruthy();
  }
  const done = await (await request.get(`/api/order/${token}`)).json();
  expect(done.status).toBe("delivered");
  expect(done.history.map((h: { status: string }) => h.status)).toEqual([
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "delivered",
  ]);
  const responses = await Promise.all([
    request.post("/api/orders", { headers: { Origin: origin }, data: payload }),
    request.post("/api/orders", { headers: { Origin: origin }, data: payload }),
  ]);
  const results = await Promise.all(responses.map((r) => r.json()));
  expect(results[0].token).toBe(results[1].token);
  const delivery = await (
    await request.get(`/api/order/${results[0].token}`)
  ).json();
  expect(delivery.total).toBe(28750);
  expect(delivery.deliveryFee).toBe(2500);
  await page.getByRole("link", { name: "Menu", exact: true }).click();
  await page.getByLabel("Availability of TEST ONLY wrap").click();
  await expect(
    page.getByLabel("Availability of TEST ONLY wrap"),
  ).not.toBeChecked();
  expect(
    (
      await request.post("/api/orders", {
        headers: { Origin: origin },
        data: { ...payload, idempotencyKey: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Staff sign in." }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/menu")).status()).toBe(401);
  await customer.close();
});

test("supplied menu categories, momo variants and GST totals render on mobile and desktop", async ({
  page,
}) => {
  expect(
    (
      await page.request.post("/api/admin/session", {
        headers: { Origin: origin },
        data: { password },
      })
    ).ok(),
  ).toBeTruthy();
  for (const item of sourceMenu.items) {
    expect(
      (
        await page.request.post("/api/admin/menu", {
          headers: { Origin: origin },
          data: item,
        })
      ).ok(),
    ).toBeTruthy();
  }
  await page.goto("/menu");
  await expect(
    page.getByRole("heading", { name: "Chicken Shawarma", exact: true }),
  ).toBeVisible();
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  }
  await page
    .getByRole("button", { name: "Momos for the Soul", exact: true })
    .click();
  await expect(page.locator("article")).toHaveCount(10);
  await expect(
    page.locator("article").filter({
      has: page.getByRole("heading", {
        name: "Steam Momos (Chicken)",
        exact: true,
      }),
    }),
  ).toContainText("₹150");
  await expect(
    page.locator("article").filter({
      has: page.getByRole("heading", {
        name: "Steam Momos (Veg)",
        exact: true,
      }),
    }),
  ).toContainText("₹120");
  await page
    .getByRole("button", { name: "Signature Lebanese", exact: true })
    .click();
  await expect(page.locator("article")).toHaveCount(8);
  await page.screenshot({
    path: "test-results/supplied-menu-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/supplied-menu-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add Chicken Shawarma", exact: true })
    .click();
  await page.getByRole("button", { name: /Open bag/ }).click();
  await expect(page.getByRole("dialog")).toContainText("₹199.50");
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await expect(page.locator("aside")).toContainText("GST (5%)");
  await expect(page.locator("aside")).toContainText("₹9.50");
  await expect(page.locator("aside")).toContainText("₹199.50");
});
