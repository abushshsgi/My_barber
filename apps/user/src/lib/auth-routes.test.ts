import { describe, expect, it } from "vitest";
import { guestMustLogin, pathRequiresAuth } from "./auth-routes";

describe("pathRequiresAuth", () => {
  it("lets guests view home, profile, try-on and chatbot", () => {
    expect(pathRequiresAuth("/")).toBe(false);
    expect(pathRequiresAuth("/profile")).toBe(false);
    expect(pathRequiresAuth("/ai-style")).toBe(false);
    expect(pathRequiresAuth("/ai-style/chat")).toBe(false);
    expect(pathRequiresAuth("/explore/fade/try")).toBe(false);
  });

  it("still requires login for functions and other pages", () => {
    expect(pathRequiresAuth("/explore")).toBe(true);
    expect(pathRequiresAuth("/explore/fade")).toBe(true);
    expect(pathRequiresAuth("/ai-style/history")).toBe(true);
    expect(pathRequiresAuth("/ai-style/care")).toBe(true);
    expect(pathRequiresAuth("/settings")).toBe(true);
    expect(pathRequiresAuth("/wallet")).toBe(true);
    expect(pathRequiresAuth("/map")).toBe(true);
    expect(pathRequiresAuth("/salon/12")).toBe(true);
    expect(pathRequiresAuth("/barber/4")).toBe(true);
    expect(pathRequiresAuth("/bookings")).toBe(true);
    expect(pathRequiresAuth("/morf-ai/look/fade")).toBe(true);
  });

  it("keeps login and legal pages public", () => {
    expect(pathRequiresAuth("/auth")).toBe(false);
    expect(pathRequiresAuth("/auth/")).toBe(false);
    expect(pathRequiresAuth("/privacy-policy")).toBe(false);
    expect(pathRequiresAuth("/terms-of-use")).toBe(false);
    expect(pathRequiresAuth("/delete-account")).toBe(false);
    expect(pathRequiresAuth("/for-salons")).toBe(false);
  });

  it("still protects the in-app privacy settings page", () => {
    expect(pathRequiresAuth("/privacy")).toBe(true);
  });

  it("lets guests view try-on and still blocks function pages", () => {
    expect(guestMustLogin("/explore/fade/try", false)).toBe(false);
    expect(guestMustLogin("/ai-style", false)).toBe(false);
    expect(guestMustLogin("/ai-style/chat", false)).toBe(false);
    expect(guestMustLogin("/profile", false)).toBe(false);
    expect(guestMustLogin("/", false)).toBe(false);
    expect(guestMustLogin("/bookings", false)).toBe(true);
    expect(guestMustLogin("/wallet", false)).toBe(true);
    expect(guestMustLogin("/ai-style", true)).toBe(false);
    expect(guestMustLogin("/auth", false)).toBe(false);
    expect(guestMustLogin("/privacy-policy", false)).toBe(false);
  });
});
