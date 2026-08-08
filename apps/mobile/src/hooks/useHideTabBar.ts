import { useNavigation } from "@react-navigation/native";
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

/** Ichki Morph ekranlarida pastki tab bar ni yashirish. */
export function useHideTabBar() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: FLOATING_TAB_BAR_STYLE });
    };
  }, [navigation]);
}
