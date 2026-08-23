import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { openWallet } from "../../api/wallet";
import { useAuth } from "../../auth/AuthContext";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import { isWalletOpened, markWalletOpened } from "../../lib/wallet-onboarding";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import { WalletCreatingScreen } from "./WalletCreatingScreen";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGate">;

const MIN_CREATE_MS = 1600;

/**
 * Yangi kirish: carousel yo‘q — «Hamyoningiz yaratilmoqda» + ensure_wallet.
 * Allaqachon ochilgan bo‘lsa — to‘g‘ridan WalletHome.
 */
export function WalletGateScreen({ navigation }: Props) {
  useHideTabBar();
  const { user } = useAuth();
  const [phase, setPhase] = useState<"boot" | "creating" | "ready" | "error">("boot");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

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
        /* creatingga o‘tamiz */
      }

      if (cancelled) return;
      setPhase("creating");
      const started = Date.now();

      try {
        await openWallet();
        await markWalletOpened(user.id);
        const wait = Math.max(0, MIN_CREATE_MS - (Date.now() - started));
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        setPhase("ready");
        await new Promise((r) => setTimeout(r, 520));
        if (!cancelled) navigation.replace("WalletHome");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Hamyon ochilmadi.");
        setPhase("error");
        // Xato bo‘lsa ham home — keyinroq /me qayta urinadi
        await new Promise((r) => setTimeout(r, 900));
        if (!cancelled) navigation.replace("WalletHome");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, navigation]);

  if (phase === "boot") {
    return <View style={styles.boot} />;
  }

  return (
    <WalletCreatingScreen
      creating={phase === "creating"}
      error={phase === "error" ? error : null}
    />
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
