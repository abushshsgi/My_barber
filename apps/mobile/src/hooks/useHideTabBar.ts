import { type NavigationProp, useNavigation } from "@react-navigation/native";
import { useLayoutEffect } from "react";

/** Floating dock tab bar — Morph stack dan qaytganda tiklash uchun. */
export const FLOATING_TAB_BAR_STYLE = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "transparent",
  borderTopWidth: 0,
  elevation: 0,
  shadowOpacity: 0,
};

/** Custom dock balandligi — kontent ostida bo‘sh joy. */
export const TAB_DOCK_CLEARANCE = 78;

type AnyNav = NavigationProp<Record<string, object | undefined>>;

function findTabNavigation(navigation: AnyNav): AnyNav | undefined {
  let parent: AnyNav | undefined = navigation.getParent() as AnyNav | undefined;
  while (parent) {
    const state = parent.getState() as { type?: string } | undefined;
    if (state?.type === "tab") return parent;
    parent = parent.getParent() as AnyNav | undefined;
  }
  return navigation.getParent() as AnyNav | undefined;
}

/** Ichki Morph ekranlarida pastki tab bar ni yashirish. */
export function useHideTabBar() {
  const navigation = useNavigation<AnyNav>();
  useLayoutEffect(() => {
    const tabNav = findTabNavigation(navigation);
    tabNav?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      const restore = findTabNavigation(navigation);
      restore?.setOptions({ tabBarStyle: FLOATING_TAB_BAR_STYLE });
    };
  }, [navigation]);
}
