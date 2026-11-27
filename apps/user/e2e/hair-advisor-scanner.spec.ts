import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const E2E_ACCESS =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.e2e-mock";
const E2E_REFRESH =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.e2e-mock-refresh";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, "../../../docs/scanner-v2-qa/screenshots");

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

/**
 * SIMULATED e2e — mocked auth / DOM only.
 * Does NOT validate physical camera decode, torch, or live barcode accuracy.
 */
test.describe("Universal Smart Scanner (mocked / simulated)", () => {
  test("demo result UI renders without login", async ({ page }) => {
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Deep Cleanse Shampoo")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Taqqoslash" })).toBeVisible();
    await expect(page.getByText("Sochingizga mosligi")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "demo-result-simulated.png"),
      fullPage: true,
    });
  });

  test("demo result shows qualitative compatibility without fake percent scores", async ({ page }) => {
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/%\s*match|match\s*%/i)).toHaveCount(0);
    await expect(page.getByText(/Manbalar|Yetishmayotgan/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("scanner route loads authenticated with Smart Scanner chrome", async ({ page }) => {
    await seedAuth(page);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ai-style\/care\/ingredient/);
    await expect(page.getByRole("heading", { name: /Smart Scanner|AI skaner/i })).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "scanner-chrome-simulated.png"),
      fullPage: false,
    });
  });

  test("mode selector exposes Barcode and Image options", async ({ page }) => {
    await seedAuth(page);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Barcode|Shtrix/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Image|Rasm|Фото/i }).first()).toBeVisible();
  });

  test("offline status surfaces when navigator.onLine is false (simulated)", async ({ page }) => {
    await seedAuth(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    });
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Offline|Офлайн|masofaviy/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("manual barcode entry dialog opens (simulated UI)", async ({ page }) => {
    await seedAuth(page);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    const enter = page.getByRole("button", { name: /Kod kiritish|Enter code|Ввести/i }).first();
    await expect(enter).toBeVisible({ timeout: 15_000 });
    await enter.click();
    await expect(page.getByPlaceholder(/EAN|UPC/i)).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "manual-entry-simulated.png"),
      fullPage: false,
    });
  });

  test("offline + mobile viewport chrome (simulated)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedAuth(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    });
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Offline|Офлайн|masofaviy/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "offline-mobile-viewport-simulated.png"),
      fullPage: false,
    });
  });

  test("demo result missing-info / sources sections (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Manbalar/i).first()).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "result-sources-desktop-simulated.png"),
      fullPage: true,
    });
  });

  test("mode image selected chrome (simulated)", async ({ page }) => {
    await seedAuth(page);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    const imageBtn = page.getByRole("button", { name: /Image|Rasm|Фото/i }).first();
    await expect(imageBtn).toBeVisible({ timeout: 15_000 });
    await imageBtn.click();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mode-image-simulated.png"),
      fullPage: false,
    });
  });
});

/** Physical device / real camera QA is documented separately — not covered here.
 *  Native Expo screenshots: NOT captured in this suite (no device / emulator in CI).
 */
