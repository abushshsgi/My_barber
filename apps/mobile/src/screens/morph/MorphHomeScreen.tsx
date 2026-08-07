import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { pickSelfieFromCamera, pickSelfieFromGallery } from "../../lib/selfie";
import { useMorphSession } from "../../morph/MorphSessionContext";
import type { MorphStackParamList } from "../../navigation/MorphStack";
import { scaleFont } from "../../theme/layout";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphHome">;

export function MorphHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const fs = (n: number) => scaleFont(n, width);
  const { isAuthenticated } = useAuth();
  const session = useMorphSession();
  const gate = useMorphLimitGate();
  const [busy, setBusy] = useState(false);

  const startWithImage = useCallback(
    async (source: "camera" | "gallery") => {
      if (!isAuthenticated) {
        navigation.getParent()?.navigate("Profile" as never);
        return;
      }
      const ok = await gate.ensureAccess();
      if (!ok) {
        navigation.navigate("MorphPaywall");
        return;
      }
      setBusy(true);
      try {
        const dataUrl =
          source === "camera"
            ? await pickSelfieFromCamera()
            : await pickSelfieFromGallery();
        if (!dataUrl) return;
        session.clear();
        session.setSelfie(dataUrl);
        navigation.navigate("MorphResults");
      } finally {
        setBusy(false);
      }
    },
    [gate, isAuthenticated, navigation, session],
  );

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <View style={styles.brandPill}>
              <Ionicons name="sparkles" size={14} color="#FFF" />
              <Text style={styles.brandText}>Morf AI</Text>
            </View>
            {gate.allowed && gate.limit > 0 ? (
              <Pressable
                style={[styles.limitPill, gate.remaining <= 2 && styles.limitLow]}
                onPress={() => navigation.navigate("MorphPaywall")}
              >
                <Text style={styles.limitText}>
                  {gate.remaining}/{gate.limit}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.title, { fontSize: fs(28) }]}>
            Yangi lookni{"\n"}sinab ko'ring
          </Text>
          <Text style={[styles.sub, { fontSize: fs(14) }]}>
            Selfie yuklang — yuz shakliga mos uslublar va AI try-on.
          </Text>
        </View>

        {!isAuthenticated ? (
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Kirish kerak</Text>
            <Text style={styles.loginSub}>
              Morph AI obuna va tarix uchun akkauntga kiring.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.getParent()?.navigate("Profile" as never)}
            >
              <Text style={styles.primaryText}>Kirish</Text>
            </Pressable>
          </View>
        ) : !gate.allowed && !gate.loading ? (
          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Obuna ochilmagan</Text>
            <Text style={styles.loginSub}>
              {gate.me?.access?.message ||
                "Morph AI faqat obuna bilan ishlaydi. Tarif tanlang."}
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate("MorphPaywall")}
            >
              <Text style={styles.primaryText}>Tariflar</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.ctaRow}>
            <Pressable
              style={styles.bigCta}
              disabled={busy}
              onPress={() => void startWithImage("camera")}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="camera" size={28} color="#FFF" />
                  <Text style={styles.bigCtaText}>Kamera</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.bigCta, styles.bigCtaAlt]}
              disabled={busy}
              onPress={() => void startWithImage("gallery")}
            >
              <Ionicons name="images" size={28} color={colors.fg} />
              <Text style={[styles.bigCtaText, styles.bigCtaTextAlt]}>Galereya</Text>
            </Pressable>
          </View>
        )}

        <Text style={[styles.sectionLabel, { fontSize: fs(13) }]}>Yana</Text>
        <View style={styles.grid}>
          <ToolCard
            icon="color-palette"
            title="Studio"
            sub={
              gate.studioLimit > 0
                ? `${gate.studioRemaining}/${gate.studioLimit}`
                : "Plus / Pro"
            }
            onPress={async () => {
              const ok = await gate.ensureStudio();
              if (!ok) {
                navigation.navigate("MorphPaywall");
                return;
              }
              navigation.navigate("MorphStudio");
            }}
          />
          <ToolCard
            icon="time"
            title="Tarix"
            sub="Try-on lar"
            onPress={() => navigation.navigate("MorphHistory")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ToolCard({
  icon,
  title,
  sub,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.tool} onPress={onPress}>
      <View style={styles.toolIcon}>
        <Ionicons name={icon} size={20} color={colors.fg} />
      </View>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolSub}>{sub}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  body: { paddingHorizontal: 20, gap: 18 },
  hero: { gap: 10, paddingTop: 8 },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  brandText: { color: "#FFF", fontWeight: "800", fontSize: 12 },
  limitPill: {
    backgroundColor: "#FFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  limitLow: { backgroundColor: "#FACC15" },
  limitText: { fontWeight: "800", fontSize: 12, color: "#0A0A0A" },
  title: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  sub: { color: "rgba(255,255,255,0.62)", lineHeight: 20 },
  loginCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  loginTitle: { color: "#FFF", fontWeight: "800", fontSize: 17 },
  loginSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 18 },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: "#FFF",
    borderRadius: 14,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontWeight: "800", color: "#0A0A0A" },
  ctaRow: { flexDirection: "row", gap: 12 },
  bigCta: {
    flex: 1,
    minHeight: 120,
    borderRadius: 22,
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  bigCtaAlt: { backgroundColor: "#FFF" },
  bigCtaText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  bigCtaTextAlt: { color: "#0A0A0A" },
  sectionLabel: {
    color: "rgba(255,255,255,0.5)",
    fontWeight: "700",
    marginTop: 4,
  },
  grid: { flexDirection: "row", gap: 12 },
  tool: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  toolIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  toolTitle: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  toolSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600" },
});
