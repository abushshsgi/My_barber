import { describe, expect, it } from "vitest";
import { hrefPathname, normalizeAppHref, parseAppHref } from "./mobile-back";

describe("normalizeAppHref", () => {
  it("drops manage=false so back does not stay on a broken wallet URL", () => {
    expect(normalizeAppHref("/wallet?section=subscriptions&manage=false")).toBe(
      "/wallet?section=subscriptions",
    );
    expect(normalizeAppHref("/wallet?manage=false")).toBe("/wallet");
  });
});

describe("parseAppHref", () => {
  it("sends wallet fallback without leftover search", () => {
    expect(parseAppHref("/wallet")).toEqual({ to: "/wallet", search: {} });
    expect(parseAppHref("/wallet?section=subscriptions")).toEqual({
      to: "/wallet",
      search: { section: "subscriptions" },
    });
  });
});

describe("hrefPathname", () => {
  it("strips query for morph detection", () => {
    expect(hrefPathname("/wallet?section=subscriptions")).toBe("/wallet");
    expect(hrefPathname("/ai-style/chat?x=1")).toBe("/ai-style/chat");
  });
});
