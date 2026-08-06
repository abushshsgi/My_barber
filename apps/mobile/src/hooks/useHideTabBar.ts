import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect } from "react";

/** Wallet stack ichida pastki tab bar ni yashirish. */
export function useHideTabBar() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    const parent = navigation.getParent();
    parent?.setOptions({ tabBarStyle: { display: "none" } });
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);
}
