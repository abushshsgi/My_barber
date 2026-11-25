import { describe, expect, it } from "vitest";
import { guestMustLogin, isNoindexPath, pathRequiresAuth } from "./auth-routes";

describe("pathRequiresAuth", () => {
  it("lets guests view home, profile, try-on and chatbot", () => {
    expect(pathRequiresAuth("/")).toBe(false);
    expect(pathRequiresAuth("/profile")).toBe(false);
    expect(pathRequiresAuth("/ai-style")).toBe(false);
    expect(pathRequiresAuth("/ai-style/chat")).toBe(false);
    expect(pathRequiresAuth("/explore/fade/try")).toBe(false);
  });

  it("allows guest read for explore, salon, barber, morf share", () => {
    expect(pathRequiresAuth("/explore")).toBe(false);
    expect(pathRequiresAuth("/explore/fade")).toBe(false);
    expect(pathRequiresAuth("/salon/12")).toBe(false);
    expect(pathRequiresAuth("/barber/4")).toBe(false);
    expect(pathRequiresAuth("/morf-ai/look/fade")).toBe(false);
    expect(pathRequiresAuth("/morf-ai/share/abc")).toBe(false);
    expect(pathRequiresAuth("/morf-ai/try-on")).toBe(false);
    expect(pathRequiresAuth("/ru/morf-ai")).toBe(false);
  });

  it("still requires login for private pages", () => {
    expect(pathRequiresAuth("/ai-style/history")).toBe(true);
    expect(pathRequiresAuth("/ai-style/care")).toBe(true);
    expect(pathRequiresAuth("/settings")).toBe(true);
    expect(pathRequiresAuth("/wallet")).toBe(true);
    expect(pathRequiresAuth("/bookings")).toBe(true);
  });

  it("keeps login and legal pages public", () => {
    expect(pathRequiresAuth("/auth")).toBe(false);
    expect(pathRequiresAuth("/privacy-policy")).toBe(false);
    expect(pathRequiresAuth("/terms-of-use")).toBe(false);
    expect(pathRequiresAuth("/for-salons")).toBe(false);
  });
});

describe("noindex", () => {
  it("flags wallet and bookings", () => {
    expect(isNoindexPath("/wallet")).toBe(true);
    expect(isNoindexPath("/explore")).toBe(false);
  });
});

describe("guestMustLogin", () => {
  it("lets guests view public pages", () => {
    expect(guestMustLogin("/explore/fade/try", false)).toBe(false);
    expect(guestMustLogin("/salon/1", false)).toBe(false);
    expect(guestMustLogin("/bookings", false)).toBe(true);
    expect(guestMustLogin("/wallet", false)).toBe(true);
  });
});