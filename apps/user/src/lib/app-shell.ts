export type AppShell = "mysaloon" | "morph";

const SHELL_KEY = "mysaloon.appShell";
const LAST_MYSALOON_KEY = "mysaloon.appShell.last.mysaloon";
const LAST_MORPH_KEY = "mysaloon.appShell.last.morph";

export const APP_SHELL_DEFAULT_MYSALOON = "/";
export const APP_SHELL_DEFAULT_MORPH = "/ai-style";

const MYSALOON_LAST_EXACT = new Set(["/", "/map", "/explore", "/profile"]);
const MORPH_LAST_EXACT = new Set([
  "/ai-style",
  "/ai-style/chat",
  "/ai-style/care",
  "/ai-style/care/ingredient",
  "/ai-style/care/products",
  "/ai-style/studio",
  "/profile",
]);

export function isMorphPath(pathname: string): boolean {
  return pathname === "/ai-style" || pathname.startsWith("/ai-style/");
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readAppShell(): AppShell {
  if (!canUseStorage()) return "mysaloon";
  try {
    const raw = localStorage.getItem(SHELL_KEY);
    return raw === "morph" ? "morph" : "mysaloon";
  } catch {
    return "mysaloon";
  }
}

export function writeAppShell(shell: AppShell): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(SHELL_KEY, shell);
  } catch {
    /* ignore quota / private mode */
  }
}

function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

export function readLastShellRoute(shell: AppShell): string {
  const fallback = shell === "morph" ? APP_SHELL_DEFAULT_MORPH : APP_SHELL_DEFAULT_MYSALOON;
  if (!canUseStorage()) return fallback;
  try {
    const key = shell === "morph" ? LAST_MORPH_KEY : LAST_MYSALOON_KEY;
    const raw = localStorage.getItem(key);
    if (!raw || !isSafeInternalPath(raw)) return fallback;
    return raw;
  } catch {
    return fallback;
  }
}

export function writeLastShellRoute(shell: AppShell, pathname: string): void {
  if (!canUseStorage() || !isSafeInternalPath(pathname)) return;
  const allowed =
    shell === "morph"
      ? MORPH_LAST_EXACT.has(pathname)
      : MYSALOON_LAST_EXACT.has(pathname);
  if (!allowed) return;
  try {
    const key = shell === "morph" ? LAST_MORPH_KEY : LAST_MYSALOON_KEY;
    localStorage.setItem(key, pathname);
  } catch {
    /* ignore */
  }
}

/** Morph dock tablari uchun oxirgi AI sahifa (profile emas). */
export function readLastMorphContentRoute(): string {
  const last = readLastShellRoute("morph");
  if (last === "/profile" || !isMorphPath(last)) return APP_SHELL_DEFAULT_MORPH;
  return last;
}
