import { test, expect } from "@playwright/test";

const E2E_ACCESS =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.e2e-mock";
const E2E_REFRESH =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.e2e-mock-refresh";

function seedAuth(page: import("@playwright/test").Page) {
  return page.addInitScript(
    ({ access, refresh }) => {
      localStorage.setItem("mybarber_user_access", access);
      localStorage.setItem("mybarber_user_refresh", refresh);
      localStorage.setItem("mysaloon.auth.user", JSON.stringify({ id: 1, phone: "900000001" }));
    },
    { access: E2E_ACCESS, refresh: E2E_REFRESH },
  );
}

test.describe("Hair Advisor scanner (mocked)", () => {
  test("demo result UI renders without login", async ({ page }) => {
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Deep Cleanse Shampoo")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Taqqoslash" })).toBeVisible();
  });

  test("scanner route loads authenticated", async ({ page }) => {
    await seedAuth(page);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ai-style\/care\/ingredient/);
  });
});

/** Mocked camera/API only — does not validate real-device barcode or OCR accuracy. */
