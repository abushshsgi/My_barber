import type { RegisteredRouter } from "@tanstack/react-router";
import { isMorphPath, APP_SHELL_DEFAULT_MORPH, APP_SHELL_DEFAULT_MYSALOON } from "./app-shell";

const MORPH_HISTORY_KEY = "mysaloon.history.morph";
const MYSALOON_HISTORY_KEY = "mysaloon.history.mysaloon";

function getStorageStack(key: string): string[] {
  if (typeof window === "undefined" || !window.sessionStorage) return [];
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function setStorageStack(key: string, stack: string[]) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(stack.slice(-30)));
  } catch {
    /* ignore */
  }
}

const inMemoryMorphHistory: string[] = [];
const inMemoryMysaloonHistory: string[] = [];

export function hrefPathname(href: string): string {
  const raw = (href || "/").split("#")[0] || "/";
  const q = raw.indexOf("?");
  return q === -1 ? raw : raw.slice(0, q) || "/";
}

export function normalizeAppHref(href: string): string {
  const raw = (href || "/").trim() || "/";
  const [pathAndQuery] = raw.split("#");
  const [path, query] = (pathAndQuery || "/").split("?");
  const pathname = path || "/";
  if (!query) return pathname;
  const params = new URLSearchParams(query);
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (value === "" || value === "undefined" || value === "false" || value === "0") return;
    kept.set(key, value);
  });
  const qs = kept.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function parseAppHref(href: string): { to: string; search: Record<string, string> } {
  const normalized = normalizeAppHref(href);
  const [path, query] = normalized.split("?");
  const search: Record<string, string> = {};
  if (query) {
    new URLSearchParams(query).forEach((value, key) => {
      search[key] = value;
    });
  }
  return { to: path || "/", search };
}

export function navigateToHref(router: RegisteredRouter, href: string) {
  const { to, search } = parseAppHref(href);
  void router.navigate({
    to: to as never,
    search: search as never,
    resetScroll: true,
  });
}

function locationHref(pathname: string, search?: string): string {
  const q = search || "";
  if (!q || q === "?") return pathname || "/";
  return `${pathname || "/"}${q.startsWith("?") ? q : `?${q}`}`;
}

export function recordRouteVisit(href: string) {
  const normalized = normalizeAppHref(href);
  const pathname = hrefPathname(normalized);
  if (!pathname || pathname === "/auth" || pathname === "/onboarding") return;

  const inMorph = isMorphPath(pathname);
  const key = inMorph ? MORPH_HISTORY_KEY : MYSALOON_HISTORY_KEY;
  const stack = getStorageStack(key);

  if (stack[stack.length - 1] !== normalized) {
    stack.push(normalized);
    setStorageStack(key, stack);
  }

  const memStack = inMorph ? inMemoryMorphHistory : inMemoryMysaloonHistory;
  if (memStack[memStack.length - 1] !== normalized) {
    memStack.push(normalized);
    if (memStack.length > 30) memStack.shift();
  }
}

export function getPreviousRoute(href: string): string | null {
  const normalized = normalizeAppHref(href);
  const pathname = hrefPathname(normalized);
  const inMorph = isMorphPath(pathname);
  const key = inMorph ? MORPH_HISTORY_KEY : MYSALOON_HISTORY_KEY;
  const stack = getStorageStack(key);
  const memStack = inMorph ? inMemoryMorphHistory : inMemoryMysaloonHistory;
  const source = stack.length > 0 ? stack : memStack;

  let idx = source.length - 1;
  while (idx >= 0 && source[idx] === normalized) {
    idx--;
  }
  if (idx >= 0) {
    const candidate = source[idx];
    const candidatePath = hrefPathname(candidate);
    if (inMorph ? isMorphPath(candidatePath) : !isMorphPath(candidatePath)) {
      return candidate;
    }
  }
  return null;
}

export function popCurrentRoute(href: string) {
  const normalized = normalizeAppHref(href);
  const pathname = hrefPathname(normalized);
  const inMorph = isMorphPath(pathname);
  const key = inMorph ? MORPH_HISTORY_KEY : MYSALOON_HISTORY_KEY;
  const stack = getStorageStack(key);
  while (stack.length > 0 && stack[stack.length - 1] === normalized) {
    stack.pop();
  }
  setStorageStack(key, stack);

  const memStack = inMorph ? inMemoryMorphHistory : inMemoryMysaloonHistory;
  while (memStack.length > 0 && memStack[memStack.length - 1] === normalized) {
    memStack.pop();
  }
}

/**
 * Shell-isolated back navigation:
 * - Morf AI sahifalarida: faqat Morf AI ichidagi oldingi sahifaga qaytadi (masalan, Studio/Try-on), MySaloon'ga o'tib ketmaydi.
 * - MySaloon sahifalarida: faqat MySaloon ichidagi oldingi sahifaga qaytadi, Morf AI ga o'tib ketmaydi.
 * - strict=true: har doim fallback (query bilan) — bir xil pathname qidiruvi saqlanib qolmasin.
 */
export function navigateBack(router: RegisteredRouter, fallback?: string, strict = false) {
  const loc = router.history.location;
  const currentHref = normalizeAppHref(
    locationHref(
      loc.pathname || (typeof window !== "undefined" ? window.location.pathname : "/"),
      loc.search || (typeof window !== "undefined" ? window.location.search : ""),
    ),
  );
  const currentPath = hrefPathname(currentHref);
  const inMorph = isMorphPath(currentPath);

  if (strict && fallback) {
    const target = normalizeAppHref(fallback);
    if (hrefPathname(target) !== currentPath || target !== currentHref) {
      popCurrentRoute(currentHref);
      navigateToHref(router, target);
      return;
    }
  }

  if (inMorph) {
    const defaultFallback =
      fallback && isMorphPath(hrefPathname(fallback)) ? fallback : APP_SHELL_DEFAULT_MORPH;
    const prev = getPreviousRoute(currentHref);
    popCurrentRoute(currentHref);

    if (prev && prev !== currentHref && isMorphPath(hrefPathname(prev))) {
      navigateToHref(router, prev);
      return;
    }

    navigateToHref(router, defaultFallback);
    return;
  }

  const defaultFallback =
    fallback && !isMorphPath(hrefPathname(fallback)) ? fallback : APP_SHELL_DEFAULT_MYSALOON;
  const prev = getPreviousRoute(currentHref);
  popCurrentRoute(currentHref);

  if (prev && prev !== currentHref && !isMorphPath(hrefPathname(prev))) {
    navigateToHref(router, prev);
    return;
  }

  navigateToHref(router, defaultFallback);
}
