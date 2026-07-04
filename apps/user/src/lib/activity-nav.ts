/** Faoliyat hub va uning ichki sahifalari navigatsiyasi. */
export const ACTIVITY_HUB_PATH = "/account/activity";

export const activityHubBackSearch = (extra?: Record<string, string>) => ({
  backTo: ACTIVITY_HUB_PATH,
  ...extra,
});

/** Ichki sahifadan qaytish — ?backTo= yoki activity hub. */
export function resolveActivityBackTo(search: Record<string, unknown>, fallback = ACTIVITY_HUB_PATH): string {
  const backTo = search.backTo;
  if (typeof backTo === "string" && backTo.startsWith("/") && !backTo.startsWith("//")) {
    return backTo;
  }
  return fallback;
}
