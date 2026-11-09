import { describe, expect, it } from "vitest";
import {
  buildAndroidChromeIntent,
  buildExternalPageUrl,
  detectInAppBrowser,
  openExternalBrowser,
  resolveExternalPageTarget,
} from "./external-browser";
import { getStashedReferralCode, rememberRedirectTarget } from "./referral-storage";

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.135 Mobile Safari/537.36";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const CHROME_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1";
const CHROME_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const INSTAGRAM_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.39 Mobile Safari/537.36 Instagram 361.0.0.0.0";
const INSTAGRAM_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 361.0.0.0.0";
const INSTAGRAM_IPAD =
  "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 361.0.0.0.0";
const FACEBOOK_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.39 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0.0;]";
const FACEBOOK_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/FBIOS;FBAV/490.0.0.0;]";

describe("detectInAppBrowser", () => {
  it("detects Instagram on Android and keeps the page on the Chrome flow", () => {
    const info = detectInAppBrowser({ userAgent: INSTAGRAM_ANDROID });
    expect(info).toEqual({ isInAppBrowser: true, source: "instagram", os: "android" });
  });

  it("detects Instagram on iPhone and iPad", () => {
    expect(detectInAppBrowser({ userAgent: INSTAGRAM_IPHONE }).os).toBe("ios");
    expect(detectInAppBrowser({ userAgent: INSTAGRAM_IPAD })).toMatchObject({
      isInAppBrowser: true,
      source: "instagram",
      os: "ios",
    });
  });

  it("does not flag Chrome or Safari", () => {
    expect(detectInAppBrowser({ userAgent: CHROME_ANDROID }).isInAppBrowser).toBe(false);
    expect(detectInAppBrowser({ userAgent: SAFARI_IPHONE }).isInAppBrowser).toBe(false);
    expect(detectInAppBrowser({ userAgent: CHROME_IPHONE }).isInAppBrowser).toBe(false);
    expect(detectInAppBrowser({ userAgent: CHROME_DESKTOP }).isInAppBrowser).toBe(false);
    expect(detectInAppBrowser({ userAgent: CHROME_ANDROID }).os).toBe("android");
    expect(detectInAppBrowser({ userAgent: SAFARI_IPHONE }).os).toBe("ios");
  });

  it("treats iPadOS desktop Safari as iOS without showing the in-app prompt", () => {
    const info = detectInAppBrowser({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
      platform: "MacIntel",
      maxTouchPoints: 5,
    });
    expect(info.isInAppBrowser).toBe(false);
    expect(info.os).toBe("ios");
  });

  it("detects Facebook in-app browsers", () => {
    expect(detectInAppBrowser({ userAgent: FACEBOOK_ANDROID })).toMatchObject({
      isInAppBrowser: true,
      source: "facebook",
      os: "android",
    });
    expect(detectInAppBrowser({ userAgent: FACEBOOK_IPHONE }).source).toBe("facebook");
  });

  it("detects Messenger without treating it as a normal browser", () => {
    const info = detectInAppBrowser({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 [FBAN/MessengerForiOS;FBAV/490.0.0.0;]",
    });
    expect(info).toMatchObject({ isInAppBrowser: true, source: "messenger", os: "ios" });
  });

  it("treats Instagram on an iPad desktop site as iOS", () => {
    const info = detectInAppBrowser({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15 Instagram 361.0.0.0.0",
      platform: "MacIntel",
      maxTouchPoints: 0,
    });
    expect(info).toEqual({ isInAppBrowser: true, source: "instagram", os: "ios" });
  });
});

describe("external browser url", () => {
  it("preserves path, utm, and referral params and strips auth tokens", () => {
    const url = buildExternalPageUrl({
      origin: "https://mysaloon.uz",
      pathname: "/explore/fade/try",
      search: "?utm_source=ig&utm_campaign=spring&ref=ABCD2345&access_token=secret&token=jwt",
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://mysaloon.uz");
    expect(parsed.pathname).toBe("/explore/fade/try");
    expect(parsed.searchParams.get("utm_source")).toBe("ig");
    expect(parsed.searchParams.get("utm_campaign")).toBe("spring");
    expect(parsed.searchParams.get("ref")).toBe("ABCD2345");
    expect(parsed.searchParams.has("access_token")).toBe(false);
    expect(parsed.searchParams.has("token")).toBe(false);
  });

  it("builds a Chrome intent that falls back to the same https page", () => {
    const page =
      "https://mysaloon.uz/explore/fade/try?utm_source=ig&utm_campaign=spring&ref=ABCD2345";
    const intent = buildAndroidChromeIntent(page);
    expect(intent.startsWith("intent://mysaloon.uz/explore/fade/try?")).toBe(true);
    expect(intent).toContain("scheme=https");
    expect(intent).toContain("package=com.android.chrome");
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(page)}`);
    expect(intent).not.toContain("play.google.com");
    expect(intent).not.toContain("market://");
  });

  it("does not invent a Safari scheme on iOS", () => {
    const assigned: string[] = [];
    const result = openExternalBrowser("ios", "https://mysaloon.uz/ai-style?utm_source=ig", (url) =>
      assigned.push(url),
    );
    expect(result).toEqual({ status: "instructions", platform: "ios" });
    expect(assigned).toEqual([]);
  });

  it("unwraps the login return path so the campaign page opens in Chrome", () => {
    const url = resolveExternalPageTarget({
      origin: "https://mysaloon.uz",
      pathname: "/auth",
      search:
        "?redirect=" +
        encodeURIComponent(
          "/explore/fade/try?utm_source=ig&utm_campaign=spring&ref=ABCD2345&access_token=secret",
        ),
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://mysaloon.uz");
    expect(parsed.pathname).toBe("/explore/fade/try");
    expect(parsed.searchParams.get("utm_source")).toBe("ig");
    expect(parsed.searchParams.get("utm_campaign")).toBe("spring");
    expect(parsed.searchParams.get("ref")).toBe("ABCD2345");
    expect(parsed.searchParams.has("access_token")).toBe(false);
  });

  it("drops an off-site login redirect instead of opening it", () => {
    const url = resolveExternalPageTarget({
      origin: "https://mysaloon.uz",
      pathname: "/auth",
      search: "?redirect=" + encodeURIComponent("https://evil.example/phish"),
    });
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://mysaloon.uz");
    expect(parsed.pathname).toBe("/auth");
    expect(parsed.searchParams.has("redirect")).toBe(false);
  });

  it("keeps a referral that was stored inside the login return path", () => {
    sessionStorage.clear();
    rememberRedirectTarget("/explore/fade/try?utm_source=ig&ref=ABCD2345");
    expect(getStashedReferralCode()).toBe("ABCD2345");
    sessionStorage.clear();
    rememberRedirectTarget("https://evil.example/?ref=ZZZZ2345");
    expect(getStashedReferralCode()).toBeNull();
  });

  it("dispatches the Android intent only from the caller", () => {
    const assigned: string[] = [];
    const result = openExternalBrowser("android", "https://mysaloon.uz/?utm_source=ig", (url) =>
      assigned.push(url),
    );
    expect(result.status).toBe("intent-dispatched");
    expect(assigned).toHaveLength(1);
    expect(assigned[0]).toContain("package=com.android.chrome");
  });
});
