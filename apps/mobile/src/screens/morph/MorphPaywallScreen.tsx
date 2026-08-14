import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MorphPaywallView } from "../../components/morph/MorphPaywallView";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  consumeMorphReturn,
  rememberMorphReturn,
  type MorphReturnTo,
  type PaywallReason,
} from "../../lib/morph-return";
import { writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

type Props =
  | NativeStackScreenProps<MorphStackParamList, "MorphPaywall">
  | NativeStackScreenProps<ProfileStackParamList, "MorphPaywall">;

type LooseNav = {
  navigate: (name: string, params?: object) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  getParent?: () => { navigate: (name: string, params?: object) => void } | undefined;
};

function leaveTo(navigation: LooseNav, returnTo?: MorphReturnTo) {
  const pending = consumeMorphReturn();
  const target = returnTo ?? pending?.returnTo;

  if (target === "MorphChat") {
    navigation.getParent?.()?.navigate("MorphChat");
    return;
  }
  if (target) {
    navigation.navigate(target);
    return;
  }
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.getParent?.()?.navigate("MorphTryOn");
}

export function MorphPaywallScreen({ navigation, route }: Props) {
  useHideTabBar();
  const params = (route.params ?? {}) as { reason?: PaywallReason; returnTo?: MorphReturnTo };
  const reason = params.reason ?? "subscription";
  const returnTo = params.returnTo;
  const nav = navigation as unknown as LooseNav;

  const onNeedLogin = () => {
    rememberMorphReturn({
      returnTo: returnTo ?? "MorphCapture",
      reason,
    });
    void writeAppShell("morph");
    void writeLastShellTab("morph", returnTo === "MorphChat" ? "MorphChat" : "MorphTryOn");
    nav.getParent?.()?.navigate("Profile");
  };

  return (
    <MorphPaywallView
      reason={reason}
      onClose={() => leaveTo(nav, returnTo)}
      onSuccess={() => leaveTo(nav, returnTo)}
      onNeedLogin={onNeedLogin}
    />
  );
}
