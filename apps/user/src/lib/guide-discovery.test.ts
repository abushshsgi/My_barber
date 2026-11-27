import { describe, expect, it } from "vitest";
import { guideCategories, rankGuides, type GuideCard } from "./guide-discovery";

const rows: GuideCard[] = [
  {
    slug: "textured-crop-soch-turmagi",
    title: "Textured Crop soch turmagi",
    excerpt: "Tepa hajmli, yonlar qisqa.",
    category: "styles",
  },
  {
    slug: "virtual-soch-turmagini-sinab-korish",
    title: "Virtual soch turmagini sinab ko'rish",
    excerpt: "Try-on namuna.",
    category: "morf-ai",
  },
  {
    slug: "shampun-tarkibini-tekshirish",
    title: "Shampun tarkibini tekshirish",
    excerpt: "Ingredientlar ro'yxati.",
    category: "hair-advisor",
  },
];

describe("rankGuides", () => {
  it("keeps category scope and exact title first", () => {
    const found = rankGuides(rows, "textured crop", "");
    expect(found[0]?.slug).toBe("textured-crop-soch-turmagi");
  });

  it("filters by a real category and ignores empty invented ones", () => {
    expect(rankGuides(rows, "", "hair-advisor")).toEqual([rows[2]]);
    expect(guideCategories(rows)).toEqual(["hair-advisor", "morf-ai", "styles"]);
  });

  it("matches excerpt without treating a miss as a result", () => {
    expect(rankGuides(rows, "ingredient", "")).toEqual([rows[2]]);
    expect(rankGuides(rows, "zzzz-no-match", "")).toEqual([]);
  });
});
