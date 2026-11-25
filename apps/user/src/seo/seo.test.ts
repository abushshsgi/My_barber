import { describe, expect, it } from "vitest";
import { buildHreflangAlternates, buildRegistryHead } from "./build-head";
import { SITE_ORIGIN } from "./constants";
import { robotsTxtBody } from "./robots";
import { renderUrlSet, staticSitemapUrls, sitemapIndexXml } from "./sitemap";
import { getCanonicalUrl, localizedPath } from "./url";
import { isNoindexPath } from "./noindex";

describe("seo url", () => {
  it("uses apex canonical origin", () => {
    expect(SITE_ORIGIN).toBe("https://mysaloon.uz");
    expect(getCanonicalUrl("/morf-ai/try-on")).toBe("https://mysaloon.uz/morf-ai/try-on");
    expect(localizedPath("/morf-ai", "ru")).toBe("/ru/morf-ai");
  });
});

describe("buildRegistryHead", () => {
  it("emits canonical and hreflang for trilingual morf hub", () => {
    const head = buildRegistryHead("morf-ai-hub", "uz");
    expect(head.meta.some((m) => m.title?.includes("Morf AI"))).toBe(true);
    expect(
      head.links.some((l) => l.rel === "canonical" && l.href.includes("mysaloon.uz/morf-ai")),
    ).toBe(true);
    const alts = buildHreflangAlternates("morf-ai-hub");
    expect(alts.length).toBe(4);
    expect(alts.some((l) => l.hrefLang === "x-default")).toBe(true);
  });
});

describe("sitemap", () => {
  it("renders index with section sitemaps", () => {
    const xml = sitemapIndexXml();
    expect(xml).toContain("/sitemap-static.xml");
    expect(xml).toContain("/sitemap-salons.xml");
  });

  it("static sitemap includes booking landing", () => {
    const urls = staticSitemapUrls();
    expect(urls.some((u) => u.loc === `${SITE_ORIGIN}/booking`)).toBe(true);
    expect(urls.some((u) => u.loc.includes("/ru/booking"))).toBe(true);
  });

  it("produces valid urlset xml", () => {
    const xml = renderUrlSet([{ loc: `${SITE_ORIGIN}/`, priority: 1 }]);
    expect(xml).toContain("<urlset");
    expect(xml).toContain("<loc>");
  });

  it("renders image extension when requested", () => {
    const xml = renderUrlSet(
      [
        {
          loc: `${SITE_ORIGIN}/explore/men-textured-crop`,
          images: [
            { loc: `${SITE_ORIGIN}/hairstyles/men/textured-crop.webp`, title: "Textured Crop" },
          ],
        },
      ],
      true,
    );
    expect(xml).toContain("xmlns:image");
    expect(xml).toContain("<image:loc>");
  });
});

describe("robots", () => {
  it("points to apex sitemap", () => {
    expect(robotsTxtBody()).toContain("Sitemap: https://mysaloon.uz/sitemap.xml");
  });
});

describe("noindex", () => {
  it("marks private app routes", () => {
    expect(isNoindexPath("/wallet")).toBe(true);
    expect(isNoindexPath("/bookings")).toBe(true);
    expect(isNoindexPath("/morf-ai/try-on")).toBe(false);
  });
});
