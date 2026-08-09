import { useLayoutEffect } from "react";
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

/** Custom dock balandligi — kontent ostida bo‘sh joy. */
export const TAB_DOCK_CLEARANCE = 78;

/** Ichki Morph ekranlarida pastki tab bar ni yashirish. */
export function useHideTabBar() {
  const { acquireHide, releaseHide } = useTabBarHideControls();
  useLayoutEffect(() => {
    acquireHide();
    return () => releaseHide();
  }, [acquireHide, releaseHide]);
}
