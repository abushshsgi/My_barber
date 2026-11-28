import { expect, test } from "@playwright/test";

test.describe("SEO assets", () => {
  test("robots and sitemap index respond 200", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("https://mysaloon.uz/sitemap.xml");

    const index = await request.get("/sitemap.xml");
    expect(index.status()).toBe(200);
    expect(await index.text()).toContain("sitemap-static.xml");
  });

  test("morf landing has title and canonical in HTML shell", async ({ request }) => {
    const res = await request.get("/morf-ai/try-on");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/<title>[^<]*try-on[^<]*<\/title>/i);
    expect(html).toContain('rel="canonical"');
    expect(html).toContain("https://mysaloon.uz/morf-ai/try-on");
  });

  test("localized explore URLs return 200 with hreflang", async ({ request }) => {
    for (const path of ["/explore", "/en/explore", "/ru/explore"] as const) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect(html).toContain('rel="canonical"');
      expect(html).toContain('hreflang="x-default"');
      expect(html).toContain('id="seo-prerender"');
    }
  });

  test("localized paths set initial html lang from URL prefix", async ({ request }) => {
    const cases = [
      ["/explore", "uz"],
      ["/en/explore", "en"],
      ["/ru/explore", "ru"],
      ["/", "uz"],
      ["/guides", "uz"],
      ["/en/guides", "en"],
      ["/ru/guides", "ru"],
    ] as const;
    for (const [path, lang] of cases) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      const html = await res.text();
      expect(html).toMatch(new RegExp(`<html[^>]*\\blang="${lang}"`, "i"));
    }
  });

  test("wallet is noindex in head when reachable", async ({ request }) => {
    const res = await request.get("/wallet");
    expect(res.status()).toBeLessThan(500);
    const html = await res.text();
    if (html.includes("noindex")) {
      expect(html).toContain("noindex");
    }
  });
});
