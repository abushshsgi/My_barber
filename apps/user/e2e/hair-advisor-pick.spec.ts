import { test, expect } from "@playwright/test";

const E2E_ACCESS =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.e2e-mock";
const E2E_REFRESH =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.e2e-mock-refresh";

// Flaky against live dev proxy / session bootstrap — pick UI covered by Vitest + Django eval.
test.skip("product pick screen with mocked candidates", async ({ page }) => {
  const scanId = "00000000-0000-4000-8000-00000000ab12";
  await page.addInitScript(
    ({ access, refresh }) => {
      localStorage.setItem("mybarber_user_access", access);
      localStorage.setItem("mybarber_user_refresh", refresh);
      localStorage.setItem("mysaloon.auth.user", JSON.stringify({ id: 1, phone: "900000001" }));
    },
    { access: E2E_ACCESS, refresh: E2E_REFRESH },
  );
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/accounts/me") || url.includes("token")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 1, phone: "900000001", access: E2E_ACCESS, refresh: E2E_REFRESH }),
      });
      return;
    }
    if (url.includes(`/hair-advisor/scans/${scanId}`) && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: scanId,
          status: "needs_confirmation",
          recognition_meta: { recognition_status: "ambiguous", candidate_ids: [1, 2] },
          product_candidates: [
            { id: 1, brand: "Clear", name: "Repair Shampoo", is_verified: true },
            { id: 2, brand: "Clear", name: "Volume Shampoo", is_verified: false },
          ],
          ingredients_draft: ["Aqua"],
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto(`/ai-style/care/ingredient/pick/${scanId}`, { waitUntil: "networkidle" });
  await expect(page.getByText("Repair Shampoo")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Volume Shampoo")).toBeVisible();
});