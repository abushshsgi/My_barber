import { describe, expect, it } from "vitest";
import { isPublicCatalogShellPath } from "@/lib/public-shell-paths";
import { shouldUsePublicRouterBootstrap } from "@/lib/split-bootstrap";

describe("split-bootstrap", () => {
  it("enables public router only on guest explore paths", () => {
    expect(isPublicCatalogShellPath("/explore")).toBe(true);
    expect(isPublicCatalogShellPath("/en/explore")).toBe(true);
    expect(isPublicCatalogShellPath("/ru/explore")).toBe(true);
    expect(isPublicCatalogShellPath("/explore/men-textured-crop")).toBe(false);
    expect(isPublicCatalogShellPath("/ai-style")).toBe(false);
  });

  it("shouldUsePublicRouterBootstrap requires guest explore in browser", () => {
    // Vitest/jsdom has `window`; without stored credentials, explore qualifies.
    expect(shouldUsePublicRouterBootstrap("/explore")).toBe(true);
    expect(shouldUsePublicRouterBootstrap("/map")).toBe(false);
  });
});