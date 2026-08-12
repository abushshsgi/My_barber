import { useLayoutEffect } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useTabBarHideControls } from "../lib/TabBarVisibility";

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

/** Custom dock balandligi — kontent ostida bo‘sh joy (markaz bump bilan). */
export const TAB_DOCK_CLEARANCE = 84;

/** Ichki Morph ekranlarida pastki tab bar ni yashirish. */
export function useHideTabBar() {
  const { acquireHide, releaseHide } = useTabBarHideControls();
  const focused = useIsFocused();
  useLayoutEffect(() => {
    if (!focused) return;
    acquireHide();
    return () => releaseHide();
  }, [focused, acquireHide, releaseHide]);
}
