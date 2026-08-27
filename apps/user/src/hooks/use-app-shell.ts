import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { hapticLight } from "@/lib/native-haptics";

export function useAppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [storedShell, setStoredShell] = useState<AppShell>("mysaloon");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStoredShell(readAppShell());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (pathname === "/auth" || pathname === "/onboarding") return;

    recordRouteVisit(pathname);

    if (isMorphPath(pathname)) {
      writeAppShell("morph");
      writeLastShellRoute("morph", pathname);
      setStoredShell("morph");
      return;
    }

    const current = readAppShell();
    if (current === "morph" && pathname === "/profile") {
      writeLastShellRoute("morph", pathname);
      setStoredShell("morph");
      return;
    }

    if (current === "mysaloon") {
      writeLastShellRoute("mysaloon", pathname);
      setStoredShell("mysaloon");
    }
  }, [pathname]);

  const shell: AppShell = isMorphPath(pathname)
    ? "morph"
    : hydrated && storedShell === "morph" && pathname === "/profile"
      ? "morph"
      : "mysaloon";

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
