import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { openWallet } from "../../api/wallet";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { isWalletOpened, markWalletOpened } from "../../lib/wallet-onboarding";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import { WalletCreatingScreen } from "./WalletCreatingScreen";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGate">;

const MIN_CREATE_MS = 1400;

/**
 * Birinchi kirish: Get Started UI → ensure_wallet.
 * Allaqachon ochilgan bo‘lsa — to‘g‘ridan WalletHome.
 */
export function WalletGateScreen({ navigation }: Props) {
  useHideTabBar();
  const { user } = useAuth();
  const [phase, setPhase] = useState<"boot" | "welcome" | "creating" | "ready" | "error">(
    "boot",
  );
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);
  const creating = useRef(false);

  const cardholderName = useMemo(() => {
    const fromParts = [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim();
    return fromParts || user?.full_name?.trim() || "";
  }, [user]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let cancelled = false;

    (async () => {
      if (!user?.id) {
        navigation.replace("WalletHome");
        return;
      }

      try {
        const opened = await isWalletOpened(user.id);
        if (cancelled) return;
        if (opened) {
          navigation.replace("WalletHome");
          return;
        }
      } catch {
        /* welcome ga o‘tamiz */
      }

      if (!cancelled) setPhase("welcome");
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, navigation]);

  const onGetStarted = useCallback(async () => {
    if (!user?.id || creating.current) return;
    if (phase !== "welcome" && phase !== "error") return;
    creating.current = true;
    setError(null);
    setPhase("creating");
    const started = Date.now();

    try {
      await openWallet();
      await markWalletOpened(user.id);
      const wait = Math.max(0, MIN_CREATE_MS - (Date.now() - started));
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      setPhase("ready");
      await new Promise((r) => setTimeout(r, 480));
      navigation.replace("WalletHome");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hamyon ochilmadi.");
      setPhase("error");
      creating.current = false;
    }
  }, [user?.id, phase, navigation]);

  if (phase === "boot") {
    return <View style={styles.boot} />;
  }

  return (
    <WalletCreatingScreen
      phase={phase}
      error={phase === "error" ? error : null}
      cardholderName={cardholderName}
      onGetStarted={() => void onGetStarted()}
    />
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
