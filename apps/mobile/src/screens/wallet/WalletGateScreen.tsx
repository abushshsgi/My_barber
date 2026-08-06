import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useWalletGate } from "../../hooks/useWallet";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import { WalletOnboardingScreen } from "./WalletOnboardingScreen";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletGate">;

/** Yangi user → carousel; ochilgan → WalletHome. */
export function WalletGateScreen({ navigation }: Props) {
  const gate = useWalletGate();

  useEffect(() => {
    if (gate.ready && !gate.needsOnboarding) {
      navigation.replace("WalletHome");
    }
  }, [gate.ready, gate.needsOnboarding, navigation]);

  if (!gate.ready || !gate.needsOnboarding) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.fg} />
      </View>
    );
  }

  return (
    <WalletOnboardingScreen
      opening={gate.opening}
      onOpen={async () => {
        await gate.open();
        navigation.replace("WalletHome");
      }}
      onSkip={async () => {
        await gate.open();
        navigation.replace("WalletHome");
      }}
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
