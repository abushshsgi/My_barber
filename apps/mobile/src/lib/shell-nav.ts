import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { useCallback } from "react";
import { useAppShell } from "./AppShellContext";
import {
  APP_SHELL_DEFAULT_MORPH,
  APP_SHELL_DEFAULT_MYSALOON,
  type AppShell,
  writeAppShell,
  writeLastShellTab,
} from "./app-shell";

/** Nested stack → Root tab navigator. */
export function getRootTabNavigation(
  navigation: NavigationProp<ParamListBase>,
): NavigationProp<ParamListBase> | undefined {
  let nav: NavigationProp<ParamListBase> | undefined = navigation;
  for (let i = 0; i < 4; i += 1) {
    const parent = nav?.getParent?.() as NavigationProp<ParamListBase> | undefined;
    if (!parent) break;
    nav = parent;
    const state = parent.getState?.();
    const names = state?.routeNames as string[] | undefined;
    if (names?.includes("Home") && names?.includes("Profile")) {
      return parent;
    }
  }
  return navigation.getParent() as NavigationProp<ParamListBase> | undefined;
}

export function navigateRootTab(
  navigation: NavigationProp<ParamListBase>,
  tab: string,
  params?: object,
) {
  const root = getRootTabNavigation(navigation);
  if (!root) return;
  const nav = root.navigate as (name: string, params?: object) => void;
  if (tab === "MorphTryOn") {
    if (params) {
      nav("MorphTryOn", params);
    } else {
      nav("MorphTryOn");
    }
    return;
  }
  if (params) {
    nav(tab, params);
    return;
  }
  nav(tab);
}

/** Storage-only (non-React). Prefer `useShellNavigation` in UI. */
export async function stayInMorphAndGo(
  navigation: NavigationProp<ParamListBase>,
  tab: string = APP_SHELL_DEFAULT_MORPH,
  params?: object,
) {
  await writeAppShell("morph");
  await writeLastShellTab("morph", tab === "MorphIngredient" ? "MorphCare" : tab);
  navigateRootTab(navigation, tab, params);
}

export async function stayInMysaloonAndGo(
  navigation: NavigationProp<ParamListBase>,
  tab: string = APP_SHELL_DEFAULT_MYSALOON,
) {
  await writeAppShell("mysaloon");
  await writeLastShellTab("mysaloon", tab);
  navigateRootTab(navigation, tab);
}

export function shellHomeTab(shell: AppShell): string {
  return shell === "morph" ? APP_SHELL_DEFAULT_MORPH : APP_SHELL_DEFAULT_MYSALOON;
}

/** Context + storage sync — shell UI va tab birga yangilanadi. */
export function useShellNavigation() {
  const { setShell, rememberTab } = useAppShell();

  const goMorph = useCallback(
    (navigation: NavigationProp<ParamListBase>, tab: string = APP_SHELL_DEFAULT_MORPH, params?: object) => {
      setShell("morph");
      rememberTab("morph", tab === "MorphIngredient" ? "MorphCare" : tab);
      navigateRootTab(navigation, tab, params);
    },
    [setShell, rememberTab],
  );

  const goMysaloon = useCallback(
    (navigation: NavigationProp<ParamListBase>, tab: string = APP_SHELL_DEFAULT_MYSALOON) => {
      setShell("mysaloon");
      rememberTab("mysaloon", tab);
      navigateRootTab(navigation, tab);
    },
    [setShell, rememberTab],
  );

  return { goMorph, goMysaloon, navigateRootTab };
}
