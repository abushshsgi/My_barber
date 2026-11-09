/**
 * Instagram / Facebook in-app browser detection and external-browser handoff.
 * Chrome and Safari user agents must not match: only explicit in-app tokens do.
 */
import { safeAuthRedirectPath } from "@/lib/referral-storage";

const SENSITIVE_QUERY_KEYS = new Set([
  "access",
  "refresh",
  "token",
  "id_token",
  "access_token",
  "refresh_token",
  "credential",
  "jwt",
  "session",
  "session_id",
]);

export const EXTERNAL_BROWSER_DISMISS_KEY = "mysaloon.externalBrowserPrompt.dismissed";
export const EXTERNAL_BROWSER_PROMPT_EVENT = "mysaloon:external-browser-prompt";

export type InAppBrowserSource = "instagram" | "facebook" | "messenger";
export type DeviceOs = "android" | "ios" | "other";

export type BrowserSignals = {
  userAgent?: string;
  platform?: string;
  maxTouchPoints?: number;
};

export type InAppBrowserInfo = {
  isInAppBrowser: boolean;
  source: InAppBrowserSource | null;
  os: DeviceOs;
};

export type ExternalBrowserOpenResult =
  | { status: "intent-dispatched"; intentUrl: string }
  | { status: "instructions"; platform: "other" };

export type IosExternalBrowser = "safari" | "chrome";

export function detectInAppSource(userAgent: string): InAppBrowserSource | null {
  const ua = userAgent || "";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/Messenger|FB_IAB\/MESSENGER|FBAN\/Messenger/i.test(ua)) return "messenger";
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) return "facebook";
  return null;
}

export function detectDeviceOs(signals: BrowserSignals): DeviceOs {
  const ua = signals.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS desktop mode reports a Mac, but touch points give it away.
  if (signals.platform === "MacIntel" && (signals.maxTouchPoints ?? 0) > 1) return "ios";
  // Instagram/Facebook on iPad can request the desktop site and drop the iPad token.
  if (
    detectInAppSource(ua) &&
    /Macintosh|Mac OS X/i.test(ua) &&
    !/Windows|Android|CrOS/i.test(ua)
  ) {
    return "ios";
  }
  return "other";
}

export function detectInAppBrowser(signals: BrowserSignals): InAppBrowserInfo {
  const source = detectInAppSource(signals.userAgent || "");
  return {
    isInAppBrowser: source !== null,
    source,
    os: detectDeviceOs(signals),
  };
}

export function readBrowserSignals(): BrowserSignals {
  if (typeof navigator === "undefined") return { userAgent: "" };
  return {
    userAgent: navigator.userAgent || "",
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

export function isExternalBrowserPromptDismissed(
  storage: Pick<Storage, "getItem"> | null,
): boolean {
  try {
    return storage?.getItem(EXTERNAL_BROWSER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissExternalBrowserPrompt(storage: Pick<Storage, "setItem"> | null): void {
  try {
    storage?.setItem(EXTERNAL_BROWSER_DISMISS_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function requestExternalBrowserPrompt(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EXTERNAL_BROWSER_PROMPT_EVENT));
}

function isSensitiveQueryKey(key: string): boolean {
  return SENSITIVE_QUERY_KEYS.has(key.toLowerCase());
}

function isSensitiveHash(hash: string): boolean {
  return /token|access|refresh|credential|jwt/i.test(hash);
}

/** Current page as an https URL: path, query, and UTM/referral stay; auth tokens do not. */
export function buildExternalPageUrl(input: {
  origin?: string;
  pathname: string;
  search?: string;
  hash?: string;
}): string {
  const fallbackOrigin = "https://mysaloon.uz";
  let origin = fallbackOrigin;
  try {
    const parsed = new URL(input.origin || fallbackOrigin);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") origin = parsed.origin;
  } catch {
    origin = fallbackOrigin;
  }

  const pathname =
    input.pathname.startsWith("/") &&
    !input.pathname.startsWith("//") &&
    !input.pathname.includes("\\")
      ? input.pathname
      : "/";
  const url = new URL(pathname, origin);
  const rawSearch = input.search || "";
  const params = new URLSearchParams(rawSearch.startsWith("?") ? rawSearch.slice(1) : rawSearch);
  for (const key of [...params.keys()]) {
    if (isSensitiveQueryKey(key)) params.delete(key);
  }
  url.search = params.toString();

  const hash = input.hash || "";
  if (hash && !isSensitiveHash(hash)) {
    url.hash = hash.startsWith("#") ? hash : `#${hash}`;
  }
  return url.toString();
}

/**
 * Page that should open in Chrome or be copied for Safari.
 * After the in-app view has already sent the guest to /auth, unwrap the safe
 * return path so UTM and referral stay on the original page.
 */
export function resolveExternalPageTarget(input: {
  origin?: string;
  pathname: string;
  search?: string;
  hash?: string;
}): string {
  const current = buildExternalPageUrl(input);
  let url: URL;
  try {
    url = new URL(current);
  } catch {
    return current;
  }
  if (url.pathname !== "/auth") return current;

  const redirectTo = safeAuthRedirectPath(url.searchParams.get("redirect"));
  if (!redirectTo) {
    if (!url.searchParams.has("redirect")) return current;
    url.searchParams.delete("redirect");
    return url.toString();
  }

  let target: URL;
  try {
    target = new URL(redirectTo, url.origin);
  } catch {
    url.searchParams.delete("redirect");
    return url.toString();
  }
  if (target.origin !== url.origin) return current;
  return buildExternalPageUrl({
    origin: url.origin,
    pathname: target.pathname,
    search: target.search,
    hash: target.hash,
  });
}

export function tryBuildAndroidChromeIntent(pageUrl: string): string | null {
  try {
    return buildAndroidChromeIntent(pageUrl);
  } catch {
    return null;
  }
}

/**
 * Android Chrome intent. Fallback stays on the https page so a missing Chrome
 * does not send the user to the Play Store.
 */
export function buildAndroidChromeIntent(pageUrl: string): string {
  const url = assertHttpUrl(pageUrl);
  const hierarchical = `${url.host}${url.pathname}${url.search}`.replace(/;/g, "%3B");
  const fallback = encodeURIComponent(url.toString());
  return `intent://${hierarchical}#Intent;action=android.intent.action.VIEW;scheme=https;package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}

/**
 * iOS handoff. These schemes only leave the in-app webview from a real link
 * tap. Safari uses Apple's x-safari scheme; Chrome uses the documented
 * googlechrome(s) scheme. The https:// prefix is replaced, not repeated.
 */
export function buildIosExternalUrl(pageUrl: string, browser: IosExternalBrowser): string {
  const url = assertHttpUrl(pageUrl);
  const hierarchical = `${url.host}${url.pathname}${url.search}${url.hash}`;
  if (browser === "chrome") {
    const scheme = url.protocol === "https:" ? "googlechromes" : "googlechrome";
    return `${scheme}://${hierarchical}`;
  }
  const scheme = url.protocol === "https:" ? "x-safari-https" : "x-safari-http";
  return `${scheme}://${hierarchical}`;
}

export function tryBuildIosExternalUrl(
  pageUrl: string,
  browser: IosExternalBrowser,
): string | null {
  try {
    return buildIosExternalUrl(pageUrl, browser);
  } catch {
    return null;
  }
}

function assertHttpUrl(pageUrl: string): URL {
  const url = new URL(pageUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("External browser URL must be http(s).");
  }
  return url;
}

export function openExternalBrowser(
  os: DeviceOs,
  pageUrl: string,
  assign: (url: string) => void = (url) => {
    if (typeof window === "undefined") return;
    window.location.assign(url);
  },
  browser: IosExternalBrowser = "safari",
): ExternalBrowserOpenResult {
  if (os === "android") {
    const intentUrl = buildAndroidChromeIntent(pageUrl);
    assign(intentUrl);
    return { status: "intent-dispatched", intentUrl };
  }
  if (os === "ios") {
    const intentUrl = buildIosExternalUrl(pageUrl, browser);
    assign(intentUrl);
    return { status: "intent-dispatched", intentUrl };
  }
  return { status: "instructions", platform: "other" };
}

export async function copyPageUrl(url: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    /* fall through to the selection fallback */
  }
  if (typeof document === "undefined") return false;
  try {
    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const ok = document.execCommand("copy");
    input.remove();
    return ok;
  } catch {
    return false;
  }
}
