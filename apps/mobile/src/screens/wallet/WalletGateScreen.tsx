import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { openWallet } from "../../api/wallet";
import { useAuth } from "../../auth/AuthContext";
import { isWalletOpened, markWalletOpened } from "../../lib/wallet-onboarding";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import { WalletOnboardingScreen } from "./WalletOnboardingScreen";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGate">;

/**
 * Tez qaror: faqat local flag (AsyncStorage).
 * API kutish spinnerda qoldirmaydi — eski bug shu edi.
 */
export function WalletGateScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"boot" | "onboarding" | "done">("boot");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
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
          setPhase("done");
          navigation.replace("WalletHome");
        } else {
          setPhase("onboarding");
        }
      } catch {
        if (!cancelled) {
          setPhase("done");
          navigation.replace("WalletHome");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, navigation]);

  const finishOpen = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    try {
      await openWallet().catch(() => null);
      if (user?.id) await markWalletOpened(user.id);
      navigation.replace("WalletHome");
    } finally {
      setOpening(false);
    }
  }, [opening, user?.id, navigation]);

  if (phase === "boot" || phase === "done") {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.fg} />
      </View>
    );
  }

  return (
    <WalletOnboardingScreen
      opening={opening}
      onOpen={() => void finishOpen()}
      onSkip={() => void finishOpen()}
    />
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
