import { useLayoutEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useTabBarHideControls } from "../lib/TabBarVisibility";
import { TAB_DOCK_CLEARANCE } from "../lib/responsive";

export { TAB_DOCK_CLEARANCE };

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

/** Ichki Morph ekranlarida pastki tab bar ni yashirish. */
export function useHideTabBar() {
  useHideTabBarWhen(true);
}

/** Faqat shart bajarilganda tab bar ni yashirish (masalan, chat ochilganda). */
export function useHideTabBarWhen(hidden: boolean) {
  const { acquireHide, releaseHide } = useTabBarHideControls();
  const focused = useIsFocused();
  useLayoutEffect(() => {
    if (!focused || !hidden) return;
    acquireHide();
    return () => releaseHide();
  }, [focused, hidden, acquireHide, releaseHide]);
}
