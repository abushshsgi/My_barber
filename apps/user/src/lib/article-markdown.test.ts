import { describe, expect, it } from "vitest";
import { guideAlternates } from "./guide-seo.server";
import { parseArticleMarkdown, readingMinutes } from "./article-markdown";

describe("article markdown", () => {
  it("keeps heading order and internal links", () => {
    const blocks = parseArticleMarkdown(
      "## Boshlash\n\n[Try-on](/ai-style) ochiladi.\n\n### Savol\n\nYo'q.\n",
    );
    expect(blocks.map((block) => block.type)).toEqual(["h2", "p", "h3", "p"]);
    const paragraph = blocks[1];
    expect(paragraph?.type).toBe("p");
    if (paragraph?.type === "p") {
      expect(
        paragraph.inlines.some((part) => part.kind === "link" && part.href === "/ai-style"),
      ).toBe(true);
    }
  });

  it("estimates a short read above zero", () => {
    expect(readingMinutes("bir ikki uch")).toBeGreaterThan(0);
  });
});

describe("guide hreflang", () => {
  it("omits unpublished translations", () => {
    const links = guideAlternates("textured-crop-soch-turmagi", ["uz"]);
    expect(links.map((link) => link.hrefLang).sort()).toEqual(["uz", "x-default"]);
    expect(links.every((link) => !link.href.includes("/ru/") && !link.href.includes("/en/"))).toBe(
      true,
    );
  });

  it("includes only locales that are published", () => {
    const links = guideAlternates("textured-crop-soch-turmagi", ["uz", "en"]);
    const langs = links.map((link) => link.hrefLang);
    expect(langs).toContain("uz");
    expect(langs).toContain("en");
    expect(langs).not.toContain("ru");
    expect(links.find((link) => link.hrefLang === "en")?.href).toBe(
      "https://mysaloon.uz/en/guides/textured-crop-soch-turmagi",
    );
  });

  it("emits one alternate per published locale", () => {
    const links = guideAlternates("virtual-soch-turmagini-sinab-korish", ["uz", "ru", "en"]);
    const langs = links.map((link) => link.hrefLang);
    expect(new Set(langs).size).toBe(langs.length);
    expect(langs.sort()).toEqual(["en", "ru", "uz", "x-default"]);
  });
});
