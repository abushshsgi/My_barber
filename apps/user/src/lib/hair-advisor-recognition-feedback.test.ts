import { describe, expect, it } from "vitest";
import { recognitionMessageFromMeta } from "./hair-advisor-recognition-feedback";

describe("recognitionMessageFromMeta", () => {
  it("maps V3 statuses", () => {
    expect(recognitionMessageFromMeta({ recognition_status: "exact_match" })).toContain("aniqlandi");
    expect(recognitionMessageFromMeta({ recognition_status: "probable_match" })).toContain("tasdiqlang");
    expect(recognitionMessageFromMeta({ ui_message_key: "similar_products" })).toContain("O‘xshash");
  });
});