import { describe, expect, it } from "vitest";
import { buildHairstyleImageSeo, hairstylePassesSitemapGate } from "./image-seo";

const sample = {
  id: "men-textured-crop",
  slug: "textured-crop",
  title: "Textured Crop",
  title_uz: "Textured Crop",
  audience: "men" as const,
  hair_length: "short" as const,
  image_url: "/hairstyles/men/textured-crop.webp",
  description_uz: "Teksturali qisqa crop — zamonaviy barber uslubi.",
  tags: ["textured", "crop", "modern"],
};

describe("buildHairstyleImageSeo", () => {
  it("emits unique override ALT for textured crop", () => {
    const seo = buildHairstyleImageSeo(sample);
    expect(seo.alt.uz).toContain("teksturali qisqa erkaklar");
    expect(seo.alt.en).toContain("short textured hair");
    expect(seo.filename).toBe("textured-crop-mens-hairstyle.webp");
    expect(seo.imageUrl).toContain("https://mysaloon.uz/hairstyles/men/textured-crop.webp");
  });

  it("differs ALT between two styles", () => {
    const other = buildHairstyleImageSeo({
      ...sample,
      id: "men-buzz-cut",
      slug: "buzz-cut",
      title: "Buzz Cut",
      tags: ["short"],
    });
    const seo = buildHairstyleImageSeo(sample);
    expect(seo.alt.uz).not.toBe(other.alt.uz);
  });

  it("sitemap quality gate", () => {
    expect(hairstylePassesSitemapGate(sample)).toBe(true);
    expect(hairstylePassesSitemapGate({ ...sample, image_url: "" })).toBe(false);
  });
});
