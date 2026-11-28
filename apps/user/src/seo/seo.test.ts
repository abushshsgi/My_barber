import { describe, expect, it } from "vitest";
import { applyDocumentLangToHtml } from "./html-utils";
import { buildHreflangAlternates, buildRegistryHead } from "./build-head";
import { SITE_ORIGIN } from "./constants";
import { robotsTxtBody } from "./robots";
import { dedupeSitemapImages, renderUrlSet, staticSitemapUrls, sitemapIndexXml } from "./sitemap";
import { getCanonicalUrl, localizedPath } from "./url";
import { isNoindexPath } from "./noindex";

describe("applyDocumentLangToHtml", () => {
  it("replaces existing lang on the html root", () => {
    const out = applyDocumentLangToHtml('<html lang="uz"><head></head></html>', "en");
    expect(out).toContain('<html lang="en">');
    expect(out).not.toContain('lang="uz"');
  });

  it("adds lang when missing", () => {
    const out = applyDocumentLangToHtml("<html><body></body></html>", "ru");
    expect(out).toContain('<html lang="ru">');
  });
});

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

  it("emits explore hreflang cluster with locale paths", () => {
    const uz = buildRegistryHead("explore", "uz");
    const en = buildRegistryHead("explore", "en");
    expect(uz.links.some((l) => l.rel === "canonical" && l.href.endsWith("/explore"))).toBe(true);
    expect(en.links.some((l) => l.rel === "canonical" && l.href.endsWith("/en/explore"))).toBe(true);
    const alts = buildHreflangAlternates("explore");
    expect(alts.some((l) => l.href.includes("/ru/explore"))).toBe(true);
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

  it("static sitemap includes localized explore cluster", () => {
    const urls = staticSitemapUrls();
    expect(urls.some((u) => u.loc === `${SITE_ORIGIN}/explore`)).toBe(true);
    expect(urls.some((u) => u.loc === `${SITE_ORIGIN}/en/explore`)).toBe(true);
    expect(urls.some((u) => u.loc === `${SITE_ORIGIN}/ru/explore`)).toBe(true);
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

  it("keeps one image:loc when the same file is listed twice", () => {
    const images = dedupeSitemapImages([
      { loc: `${SITE_ORIGIN}/hairstyles/men/personas/irland/textured-crop.webp`, title: "A" },
      { loc: `${SITE_ORIGIN}/hairstyles/men/personas/irland/textured-crop.webp`, title: "A again" },
      { loc: `${SITE_ORIGIN}/hairstyles/men/personas/irland/french-crop.webp`, title: "B" },
    ]);
    expect(images).toHaveLength(2);
    const xml = renderUrlSet(
      [{ loc: `${SITE_ORIGIN}/explore/men-textured-crop`, images }],
      true,
    );
    expect(xml.match(/<image:loc>/g)).toHaveLength(2);
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
