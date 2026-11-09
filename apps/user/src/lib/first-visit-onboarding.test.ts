import { afterEach, describe, expect, it } from "vitest";
import {
  FIRST_VISIT_ONBOARDING_KEY,
  dismissFirstVisitForThisLoad,
  isAuthCallbackLocation,
  readFirstVisitStatus,
  resetFirstVisitLoadState,
  shouldShowFirstVisitFromBrowser,
  shouldShowFirstVisitOnboarding,
  writeFirstVisitStatus,
  type FirstVisitLocation,
} from "./first-visit-onboarding";

function memoryStorage(options?: { failRead?: boolean; failWrite?: boolean; initial?: string }) {
  let value = options?.initial;
  return {
    getItem(key: string) {
      if (options?.failRead) throw new Error("read denied");
      if (key !== FIRST_VISIT_ONBOARDING_KEY) return null;
      return value ?? null;
    },
    setItem(key: string, next: string) {
      if (options?.failWrite) throw new Error("write denied");
      if (key === FIRST_VISIT_ONBOARDING_KEY) value = next;
    },
  };
}

function show(
  location: FirstVisitLocation,
  extras?: { status?: "completed" | "skipped"; hasSession?: boolean; failRead?: boolean },
) {
  return shouldShowFirstVisitOnboarding({
    storage: memoryStorage({
      initial: extras?.status,
      failRead: extras?.failRead,
    }),
    hasSession: extras?.hasSession ?? false,
    location,
  });
}

describe("first-visit onboarding visibility", () => {
  afterEach(() => {
    resetFirstVisitLoadState();
    window.localStorage.removeItem(FIRST_VISIT_ONBOARDING_KEY);
    window.history.replaceState(null, "", "/");
  });

  it("shows slide 1 for a new guest on the home page", () => {
    expect(show({ pathname: "/", search: "?utm_source=ig&utm_campaign=spring&ref=ABCD2345" })).toBe(
      true,
    );
  });

  it("stays hidden after completion or skip", () => {
    expect(show({ pathname: "/" }, { status: "completed" })).toBe(false);
    expect(show({ pathname: "/" }, { status: "skipped" })).toBe(false);
  });

  it("does not interrupt a logged-in session", () => {
    expect(show({ pathname: "/" }, { hasSession: true })).toBe(false);
  });

  it("shows before the login page and hides only during an auth callback", () => {
    expect(isAuthCallbackLocation({ pathname: "/auth" })).toBe(false);
    expect(isAuthCallbackLocation({ pathname: "/auth/" })).toBe(false);
    expect(show({ pathname: "/auth", search: "?redirect=/&utm_source=ig" })).toBe(true);
    expect(show({ pathname: "/auth", search: "?access_token=secret" })).toBe(false);
    expect(show({ pathname: "/", search: "?access_token=secret" })).toBe(false);
    expect(show({ pathname: "/", hash: "#id_token=secret" })).toBe(false);
    expect(show({ pathname: "/", search: "?code=abc&state=xyz" })).toBe(false);
    expect(show({ pathname: "/", search: "?token=jwt" })).toBe(false);
    expect(show({ pathname: "/", search: "?code=ABCD2345&utm_source=ig" })).toBe(true);
  });

  it("hides when storage cannot be read and still records skip or completion", () => {
    expect(show({ pathname: "/" }, { failRead: true })).toBe(false);

    const storage = memoryStorage();
    expect(writeFirstVisitStatus(storage, "skipped")).toBe(true);
    expect(readFirstVisitStatus(storage)).toEqual({ readable: true, status: "skipped" });
    expect(writeFirstVisitStatus(storage, "completed")).toBe(true);
    expect(readFirstVisitStatus(storage).status).toBe("completed");

    const broken = memoryStorage({ failWrite: true });
    expect(writeFirstVisitStatus(broken, "completed")).toBe(false);
    expect(readFirstVisitStatus(broken).status).toBe(null);
  });

  it("closes for the rest of this page load even before a refresh", () => {
    window.localStorage.removeItem(FIRST_VISIT_ONBOARDING_KEY);
    window.history.replaceState(null, "", "/?utm_source=ig");
    expect(shouldShowFirstVisitFromBrowser(false)).toBe(true);
    dismissFirstVisitForThisLoad();
    expect(shouldShowFirstVisitFromBrowser(false)).toBe(false);
  });
});
