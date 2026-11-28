import { describe, expect, it } from "vitest";
import { isPublicCatalogShellPath } from "./public-shell-paths";

describe("isPublicCatalogShellPath", () => {
  it("matches explore catalog only", () => {
    expect(isPublicCatalogShellPath("/explore")).toBe(true);
    expect(isPublicCatalogShellPath("/en/explore")).toBe(true);
    expect(isPublicCatalogShellPath("/ru/explore")).toBe(true);
    expect(isPublicCatalogShellPath("/explore/men-textured-crop")).toBe(false);
    expect(isPublicCatalogShellPath("/wallet")).toBe(false);
    expect(isPublicCatalogShellPath("/ai-style")).toBe(false);
  });
});