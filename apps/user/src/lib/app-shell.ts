export type AppShell = "mysaloon" | "morph";

const SHELL_KEY = "mysaloon.appShell";
const LAST_MYSALOON_KEY = "mysaloon.appShell.last.mysaloon";
const LAST_MORPH_KEY = "mysaloon.appShell.last.morph";
/** Bir marta: yangi foydalanuvchi Morf AI dan boshlaydi. Saqlangan tanlov qoladi. */
const MORPH_FIRST_KEY = "mysaloon.appShell.morphFirst.v1";

export const APP_SHELL_DEFAULT_MYSALOON = "/";
export const APP_SHELL_DEFAULT_MORPH = "/ai-style";

const MYSALOON_LAST_EXACT = new Set(["/", "/profile"]);
const MORPH_LAST_EXACT = new Set([
  "/ai-style",
  "/ai-style/chat",
  "/ai-style/care",
  "/profile",
]);

export function isMorphPath(pathname: string): boolean {
  return (
    pathname === "/ai-style" ||
    pathname.startsWith("/ai-style/") ||
    pathname.startsWith("/morf-ai/") ||
    (pathname.startsWith("/explore/") && pathname.endsWith("/try"))
  );
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readAppShell(): AppShell {
  if (!canUseStorage()) return "morph";
  try {
    const migrated = localStorage.getItem(MORPH_FIRST_KEY);
    if (migrated !== "1") {
      localStorage.setItem(MORPH_FIRST_KEY, "1");
      const existing = localStorage.getItem(SHELL_KEY);
      if (existing === "mysaloon" || existing === "morph") return existing;
      localStorage.setItem(SHELL_KEY, "morph");
      return "morph";
    }
    const raw = localStorage.getItem(SHELL_KEY);
    return raw === "mysaloon" ? "mysaloon" : "morph";
  } catch {
    return "morph";
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
    shell === "morph" ? MORPH_LAST_EXACT.has(pathname) : MYSALOON_LAST_EXACT.has(pathname);
  if (!allowed) return;
  try {
    const key = shell === "morph" ? LAST_MORPH_KEY : LAST_MYSALOON_KEY;
    localStorage.setItem(key, pathname);
  } catch {
    /* ignore */
  }
}

/** Morph shellga o‘tganda profil va chat emas, oxirgi AI sahifa (odatda try-on). */
export function readLastMorphContentRoute(): string {
  const last = readLastShellRoute("morph");
  if (
    last === "/profile" ||
    last === "/ai-style/chat" ||
    last === "/ai-style/studio" ||
    last.startsWith("/ai-style/care/ingredient") ||
    !isMorphPath(last)
  ) {
    return APP_SHELL_DEFAULT_MORPH;
  }
  return last;
}
