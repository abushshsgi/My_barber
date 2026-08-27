import type { RegisteredRouter } from "@tanstack/react-router";
import {
  isMorphPath,
  APP_SHELL_DEFAULT_MORPH,
  APP_SHELL_DEFAULT_MYSALOON,
} from "./app-shell";

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

export function recordRouteVisit(pathname: string) {
  if (!pathname || pathname === "/auth" || pathname === "/onboarding") return;

  const inMorph = isMorphPath(pathname);
  const key = inMorph ? MORPH_HISTORY_KEY : MYSALOON_HISTORY_KEY;
  const stack = getStorageStack(key);

  if (stack[stack.length - 1] !== pathname) {
    stack.push(pathname);
    setStorageStack(key, stack);
  }

  if (inMorph) {
    if (inMemoryMorphHistory[inMemoryMorphHistory.length - 1] !== pathname) {
      inMemoryMorphHistory.push(pathname);
      if (inMemoryMorphHistory.length > 30) inMemoryMorphHistory.shift();
    }
  } else {
    if (inMemoryMysaloonHistory[inMemoryMysaloonHistory.length - 1] !== pathname) {
      inMemoryMysaloonHistory.push(pathname);
      if (inMemoryMysaloonHistory.length > 30) inMemoryMysaloonHistory.shift();
    }
  }
}

export function getPreviousRoute(pathname: string): string | null {
  const inMorph = isMorphPath(pathname);
  const key = inMorph ? MORPH_HISTORY_KEY : MYSALOON_HISTORY_KEY;
  const stack = getStorageStack(key);
  const memStack = inMorph ? inMemoryMorphHistory : inMemoryMysaloonHistory;
  const source = stack.length > 0 ? stack : memStack;

  let idx = source.length - 1;
  while (idx >= 0 && source[idx] === pathname) {
    idx--;
  }
  if (idx >= 0) {
    const candidate = source[idx];
    if (inMorph ? isMorphPath(candidate) : !isMorphPath(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function popCurrentRoute(pathname: string) {
  const inMorph = isMorphPath(pathname);
  const key = inMorph ? MORPH_HISTORY_KEY : MYSALOON_HISTORY_KEY;
  const stack = getStorageStack(key);
  while (stack.length > 0 && stack[stack.length - 1] === pathname) {
    stack.pop();
  }
  setStorageStack(key, stack);

  const memStack = inMorph ? inMemoryMorphHistory : inMemoryMysaloonHistory;
  while (memStack.length > 0 && memStack[memStack.length - 1] === pathname) {
    memStack.pop();
  }
}

/**
 * Shell-isolated back navigation:
 * - Morf AI sahifalarida: faqat Morf AI ichidagi oldingi sahifaga qaytadi (masalan, Studio/Try-on), MySaloon'ga o'tib ketmaydi.
 * - MySaloon sahifalarida: faqat MySaloon ichidagi oldingi sahifaga qaytadi, Morf AI ga o'tib ketmaydi.
 */
export function navigateBack(
  router: RegisteredRouter,
  fallback?: string,
  _strict = false,
) {
  const currentPath =
    router.history.location.pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const inMorph = isMorphPath(currentPath);

  if (inMorph) {
    const defaultFallback =
      fallback && isMorphPath(fallback) ? fallback : APP_SHELL_DEFAULT_MORPH;
    const prev = getPreviousRoute(currentPath);
    popCurrentRoute(currentPath);

    if (prev && prev !== currentPath && isMorphPath(prev)) {
      void router.navigate({ to: prev as never, resetScroll: true });
      return;
    }

    void router.navigate({ to: defaultFallback as never, resetScroll: true });
    return;
  }

  const defaultFallback =
    fallback && !isMorphPath(fallback) ? fallback : APP_SHELL_DEFAULT_MYSALOON;
  const prev = getPreviousRoute(currentPath);
  popCurrentRoute(currentPath);

  if (prev && prev !== currentPath && !isMorphPath(prev)) {
    void router.navigate({ to: prev as never, resetScroll: true });
    return;
  }

  void router.navigate({ to: defaultFallback as never, resetScroll: true });
}
