import { describe, expect, it } from "vitest";
import { lengthCategoryPath, rankRelatedHairstyles, type RelatedStyle } from "./related-hairstyles";

const current: RelatedStyle = {
  id: "men-textured-crop",
  category: "crop",
  hairLength: "short",
  audience: "men",
  tags: ["texture"],
};

const all: RelatedStyle[] = [
  current,
  {
    id: "men-french-crop",
    category: "crop",
    hairLength: "short",
    audience: "men",
    tags: ["texture"],
  },
  {
    id: "men-buzz",
    category: "buzz",
    hairLength: "short",
    audience: "men",
    tags: [],
  },
  {
    id: "women-long",
    category: "layers",
    hairLength: "long",
    audience: "women",
    tags: [],
  },
];

describe("rankRelatedHairstyles", () => {
  it("prefers the same category and excludes the current style", () => {
    const ranked = rankRelatedHairstyles(current, all);
    expect(ranked.map((item) => item.id)).toEqual(["men-french-crop", "men-buzz"]);
  });

  it("maps real length values to existing category routes", () => {
    expect(lengthCategoryPath("short")).toBe("/explore/category/short-haircuts");
    expect(lengthCategoryPath("unknown")).toBeNull();
  });
});
