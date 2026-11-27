import { test, expect } from "@playwright/test";
import {
  obtainIsolatedTokens,
  seedIsolatedAuth,
  verifyHistoryApiAccess,
} from "./helpers/isolated-auth";

test.describe("Universal Smart Scanner (isolated auth)", () => {
  test("demo result UI renders without login", async ({ page }) => {
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Deep Cleanse Shampoo")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Namuna natija|Sample result/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Morf AI/i }).first()).toBeVisible();
  });

  test("scanner route loads authenticated with Smart Scanner chrome", async ({ page, request }) => {
    const tokens = await obtainIsolatedTokens(request);
    await seedIsolatedAuth(page, tokens);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ai-style\/care\/ingredient/);
    await expect(page.getByRole("heading", { name: /Smart Scanner/i })).toBeVisible({
      timeout: 25_000,
    });
  });

  test("mode selector exposes Barcode and Image options", async ({ page, request }) => {
    const tokens = await obtainIsolatedTokens(request);
    await seedIsolatedAuth(page, tokens);
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /Barcode|Shtrix/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: /Image|Rasm|Фото/i }).first()).toBeVisible();
  });

  test("history API empty with real JWT", async ({ request }) => {
    const tokens = await obtainIsolatedTokens(request);
    const hist = await verifyHistoryApiAccess(request, tokens);
    expect(hist.status).toBe(200);
    expect(hist.count).toBe(0);
  });

  test("history empty state with real API session", async ({ page, request }) => {
    const tokens = await obtainIsolatedTokens(request);
    await seedIsolatedAuth(page, tokens);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ai-style/care/ingredient", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Tarix|History|История/i }).click();
    await expect(
      page.getByText(/Hali mahsulot skanerlanmagan|No products scanned yet|нет отсканированных/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("advisor demo links to scan page with history search", async ({ page, request }) => {
    const tokens = await obtainIsolatedTokens(request);
    await seedIsolatedAuth(page, tokens);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ai-style/care/ingredient/result/demo", { waitUntil: "domcontentloaded" });
    const historyLink = page.getByRole("link", {
      name: /Skanerlash tarixi|Scan history|История сканов/i,
    });
    await expect(historyLink).toBeVisible();
    const href = await historyLink.getAttribute("href");
    expect(href ?? "").toMatch(/history=/);
  });
});

/** Does not validate real-device barcode, OCR, or camera hardware. */