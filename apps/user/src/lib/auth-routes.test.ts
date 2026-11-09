import { describe, expect, it } from "vitest";
import { guestMustLogin, pathRequiresAuth } from "./auth-routes";

describe("pathRequiresAuth", () => {
  it("sends product pages, including try-on, to login", () => {
    expect(pathRequiresAuth("/")).toBe(true);
    expect(pathRequiresAuth("/explore")).toBe(true);
    expect(pathRequiresAuth("/explore/fade")).toBe(true);
    expect(pathRequiresAuth("/explore/fade/try")).toBe(true);
    expect(pathRequiresAuth("/ai-style")).toBe(true);
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

  it("blocks guests on try-on and lets a session through", () => {
    expect(guestMustLogin("/explore/fade/try", false)).toBe(true);
    expect(guestMustLogin("/ai-style", false)).toBe(true);
    expect(guestMustLogin("/", false)).toBe(true);
    expect(guestMustLogin("/explore/fade/try", true)).toBe(false);
    expect(guestMustLogin("/auth", false)).toBe(false);
    expect(guestMustLogin("/privacy-policy", false)).toBe(false);
  });
});
