const DISMISS_KEY = "mysaloon_partner_pwa_hint_dismissed";

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Line\/|Twitter|Telegram|WhatsApp|LinkedInApp|Snapchat/i.test(
    ua,
  );
}

export function isIosNonSafariBrowser(): boolean {
  if (!isIosDevice()) return false;
  return /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA\//i.test(navigator.userAgent);
}

export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  if (isInAppBrowser() || isIosNonSafariBrowser()) return false;
  return /Safari/i.test(navigator.userAgent);
}

export function canShowIosInstallUi(): boolean {
  return isIosDevice() && !isStandalonePwa();
}

export function isPwaHintDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPwaHint(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

export function resetPwaHintDismissed(): void {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {
    // ignore
  }
}

export type IosInstallMode = "safari" | "in_app" | "other_browser";

export function getIosInstallMode(): IosInstallMode {
  if (isInAppBrowser()) return "in_app";
  if (isIosNonSafariBrowser()) return "other_browser";
  return "safari";
}

export function pwaInstallSiteUrl(): string {
  if (typeof window === "undefined") return "https://partner.mysaloon.uz";
  return window.location.origin;
}
