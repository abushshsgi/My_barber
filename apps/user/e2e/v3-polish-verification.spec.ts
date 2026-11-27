/**
 * V3 polish visual verification — captures after-* screenshots (simulated camera where noted).
 * Run: PLAYWRIGHT_SKIP_WEB_SERVER=1 npx playwright test e2e/v3-polish-verification.spec.ts
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOT_DIR = path.resolve(__dirname, "../../../docs/mysaloon-v3-qa/screenshots/polish");

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

async function shot(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: true });
}

test.describe("V3 polish after screenshots", () => {
  test("scanner permission denied (simulated — no camera grant)", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await seedAuth(page);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/Avtomatik skanerlash faol/i);
    await shot(page, "after-scanner-permission-denied.png");
    await context.close();
  });

  test("scan history empty state", async ({ page }) => {
    await seedAuth(page);
    await page.route("**/api/v1/hair-advisor/history/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ai-style/care/ingredient", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Tarix|History|История/i }).click();
    await expect(page.getByText(/Hali mahsulot skanerlanmagan|No products scanned yet|нет отсканированных/i)).toBeVisible({
      timeout: 15_000,
    });
    await shot(page, "after-history-empty.png");
  });

  test("advisor demo mobile and desktop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "networkidle" });
    await expect(page.getByText(/Namuna natija|Sample result|Демо-результат/i)).toBeVisible();
    await shot(page, "after-advisor-mobile.png");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "networkidle" });
    await shot(page, "after-advisor-desktop.png");
  });

  test("morf gallery icon", async ({ page }) => {
    await seedAuth(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ai-style", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /Galereyadan|gallery|Галере/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    await shot(page, "after-morf-gallery.png");
  });

  test("guides RU and EN", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ru/guides", { waitUntil: "networkidle" });
    await shot(page, "after-guides-ru.png");
    await page.goto("/en/guides", { waitUntil: "networkidle" });
    await shot(page, "after-guides-en.png");
  });

  test("explore at 836px", async ({ page }) => {
    await page.setViewportSize({ width: 836, height: 900 });
    await page.goto("/explore", { waitUntil: "networkidle" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflowX).toBe(false);
    await shot(page, "after-explore-836.png");
  });

  test("hairstyle detail try-on CTA at 390px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/explore/men-textured-crop", { waitUntil: "networkidle" });
    const cta = page.getByRole("link", { name: /O'zingizda ko'ring|Try on yourself|Примерить/i });
    await expect(cta.first()).toBeVisible({ timeout: 15_000 });
    const text = await cta.first().innerText();
    expect(text).not.toMatch(/…|\.\.\./);
    await shot(page, "after-detail-390.png");
  });

  test("article reading width desktop", async ({ page, request }) => {
    const draft = await request.get(
      "/api/v1/content/articles/virtual-soch-turmagini-sinab-korish/?locale=uz&preview=1",
    );
    if (draft.status() !== 200) {
      test.skip(true, "Draft preview unavailable — use guides shell only");
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/guides/virtual-soch-turmagini-sinab-korish?preview=1", { waitUntil: "networkidle" });
    const prose = page.locator(".max-w-\\[70ch\\]").first();
    if (await prose.count()) {
      const box = await prose.boundingBox();
      expect(box?.width ?? 0).toBeLessThanOrEqual(760);
      expect(box?.width ?? 0).toBeGreaterThan(400);
    }
    await shot(page, "after-article-desktop.png");
  });
});

test.describe("Scanner regression (simulated)", () => {
  test("denied state hides active scanning copy", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await seedAuth(page);
    await page.goto("/ai-style/care/ingredient");
    await expect(page.getByText(/Avtomatik skanerlash faol|Automatic scanning active/i)).toHaveCount(0);
    await context.close();
  });
});