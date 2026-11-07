import { describe, expect, it } from "vitest";
import { hairstyleExploreHref, hairstyleTryHref } from "./chat-hairstyle";

describe("chat hairstyle links", () => {
  it("opens the Explore style page", () => {
    expect(hairstyleExploreHref("men-textured-crop")).toBe("/explore/men-textured-crop");
  });

  it("opens the existing try-on flow for that catalog id", () => {
    expect(hairstyleTryHref("women-soft-bob")).toBe("/explore/women-soft-bob/try");
  });

  it("encodes ids that contain reserved characters", () => {
    expect(hairstyleExploreHref("men/fade cut")).toBe("/explore/men%2Ffade%20cut");
  });
});
