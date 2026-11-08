import { describe, expect, it } from "vitest";
import { parseWalletManageFlag, parseWalletSearch, parseWalletSection } from "./wallet-nav";

describe("parseWalletSearch", () => {
  it("drops unknown wallet sections such as subscriptions", () => {
    const search = parseWalletSearch({ section: "subscriptions", manage: "false" });
    expect(search.section).toBe("subscriptions");
    expect(search.manage).toBeUndefined();
    expect(parseWalletSection(search.section, search.manage)).toBe("overview");
  });

  it("does not throw on junk query values", () => {
    expect(() => parseWalletSearch({ section: 12, manage: "nope", plan: null })).not.toThrow();
    const search = parseWalletSearch({ section: 12, manage: "nope", plan: null });
    expect(search.section).toBeUndefined();
    expect(search.manage).toBeUndefined();
  });

  it("treats manage=1 as transactions via legacy flag", () => {
    const search = parseWalletSearch({ manage: "1" });
    expect(search.manage).toBe(true);
    expect(parseWalletSection(search.section, search.manage)).toBe("transactions");
  });
});

describe("parseWalletManageFlag", () => {
  it("ignores falsey query flags", () => {
    expect(parseWalletManageFlag(false)).toBeUndefined();
    expect(parseWalletManageFlag("false")).toBeUndefined();
    expect(parseWalletManageFlag("0")).toBeUndefined();
    expect(parseWalletManageFlag(0)).toBeUndefined();
  });
});
