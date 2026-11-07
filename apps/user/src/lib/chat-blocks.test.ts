import { describe, expect, it } from "vitest";
import type { ChatHairstyleCard } from "@/lib/api/ai";
import { blocksFromLegacy, layoutForCount, visualBlocks } from "./chat-blocks";

const cards: ChatHairstyleCard[] = [
  { id: "a", name: "Crop", image_url: "/hairstyles/men/crop.webp", description: "Qisqa" },
  { id: "b", name: "Fade", image_url: "/hairstyles/men/fade.webp", description: "Fade" },
];

describe("chat content blocks", () => {
  it("picks a layout from how many catalog images arrived", () => {
    expect(layoutForCount(1)).toBe("single_image");
    expect(layoutForCount(2)).toBe("image_pair");
    expect(layoutForCount(2, "comparison")).toBe("comparison");
    expect(layoutForCount(4)).toBe("image_grid");
    expect(layoutForCount(6)).toBe("image_carousel");
  });

  it("places legacy images between the intro and the explanation", () => {
    const blocks = blocksFromLegacy("Mana ikki uslub. Birinchisi qisqa, ikkinchisi fade.", cards);
    expect(blocks.map((block) => block.type)).toEqual(["text", "image_pair", "text"]);
    if (blocks[1]?.type === "text") throw new Error("expected images");
    expect(blocks[1]?.type).toBe("image_pair");
    if (blocks[1].type === "image_pair") {
      expect(blocks[1].items.map((item) => item.id)).toEqual(["a", "b"]);
    }
  });

  it("keeps server block order instead of appending images", () => {
    const blocks = visualBlocks("ignored", [
      { type: "text", content: "Kirish" },
      { type: "single_image", items: [cards[0]!] },
      { type: "text", content: "Xulosa" },
    ]);
    expect(blocks.map((block) => block.type)).toEqual(["text", "single_image", "text"]);
  });
});
