import { Image } from "expo-image";
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, View } from "react-native";
import { morfMarkWhite } from "../branding/morf-logo";
import type { AppShell } from "../lib/app-shell";
import { colors } from "../theme/colors";

const mysaloonIcon = require("../../assets/icon.png");

type Props = {
  visible: boolean;
  target: AppShell | null;
};

/** MySaloon ↔ Morf AI shell almashtirish paytidagi loading. */
export function ShellSwitchOverlay({ visible, target }: Props) {
  if (!visible || !target) return null;

  const toMorph = target === "morph";

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            {toMorph ? (
              <Image source={morfMarkWhite} style={styles.logo} contentFit="contain" />
            ) : (
              <Image source={mysaloonIcon} style={styles.appIcon} contentFit="cover" />
            )}
          </View>
          <Text style={styles.title}>{toMorph ? "Morf AI" : "MySaloon"}</Text>
          <Text style={styles.sub}>Yuklanmoqda…</Text>
          <ActivityIndicator color="#FFF" style={styles.spinner} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 24,
    backgroundColor: colors.fg,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
    ...Platform.select({
      web: { boxShadow: "0 16px 40px rgba(0,0,0,0.35)" },
      default: {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 16,
      },
    }),
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logo: {
    width: 32,
    height: 32,
  },
  appIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  title: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sub: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    fontWeight: "600",
  },
  spinner: {
    marginTop: 12,
  },
});
