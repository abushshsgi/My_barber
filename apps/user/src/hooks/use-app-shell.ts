import { useNavigate, useRouterState } from "@tanstack/react-router";
import { startTransition, useEffect, useState } from "react";
import {
  type AppShell,
  isMorphPath,
  readAppShell,
  readLastMorphContentRoute,
  readLastShellRoute,
  writeAppShell,
  writeLastShellRoute,
} from "@/lib/app-shell";
import { recordRouteVisit } from "@/lib/mobile-back";
import { isMysaloonPausedPath } from "@/lib/mysaloon-paused";
import { hapticLight } from "@/lib/native-haptics";

export function useAppShell() {
  const location = useRouterState({
    select: (s) => ({ pathname: s.location.pathname, search: s.location.searchStr }),
  });
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [storedShell, setStoredShell] = useState<AppShell>("morph");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = readAppShell();
    startTransition(() => {
      setStoredShell(next);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (pathname === "/auth" || pathname === "/onboarding") return;

    const search = location.search || "";
    const href = search && !search.startsWith("?") ? `${pathname}?${search}` : `${pathname}${search}`;
    recordRouteVisit(href);

    if (isMorphPath(pathname)) {
      writeAppShell("morph");
      writeLastShellRoute("morph", pathname);
      setStoredShell("morph");
      return;
    }

    const current = readAppShell();
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    // Telefonda yangi tashrif / Morf shell — bosh sahifa try-on (Morf switch) ga o‘tadi.
    if (mobile && pathname === "/" && current !== "mysaloon") {
      const to = readLastMorphContentRoute();
      if (to !== pathname) {
        void navigate({ to: to as never, replace: true });
      }
      return;
    }

    if (current === "morph" && pathname === "/profile") {
      writeLastShellRoute("morph", pathname);
      setStoredShell("morph");
      return;
    }

    if (current === "mysaloon") {
      writeLastShellRoute("mysaloon", pathname);
      setStoredShell("mysaloon");
    }
  }, [navigate, pathname, location.search]);

  const shell: AppShell = isMorphPath(pathname)
    ? "morph"
    : isMysaloonPausedPath(pathname)
      ? "mysaloon"
      : hydrated
        ? storedShell
        : "morph";

  const switchToMorph = () => {
    void hapticLight();
    writeAppShell("morph");
    setStoredShell("morph");
    const to = readLastMorphContentRoute();
    void navigate({ to: to as never, resetScroll: true });
  };

  const switchToMysaloon = () => {
    void hapticLight();
    writeAppShell("mysaloon");
    setStoredShell("mysaloon");
    const to = readLastShellRoute("mysaloon");
    void navigate({ to: to as never, resetScroll: true });
  };

  return { shell, switchToMorph, switchToMysaloon };
}
