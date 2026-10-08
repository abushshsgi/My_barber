import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useShellTheme, type ShellTheme } from "../../lib/useShellTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletFaq">;

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

/** Savol-javob (vopros i otvet). */
export function WalletFaqScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const pal = useShellTheme();
  const styles = useMemo(
    () => createFaqStyles(pal),
    [pal.bg, pal.fg, pal.muted, pal.card],
  );
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<number | null>(0);
  const faq = useMemo(
    () =>
      FAQ_KEYS.map((key) => ({
        q: t(`walletPages.faq.${key}`),
        a: t(`walletPages.faq.a${key.slice(1)}`),
      })),
    [t],
  );

  return (
    <View style={[styles.root, { paddingTop: safeTop(insets.top, 8), paddingBottom: safeBottom(insets.bottom, 16) }]}>
      <View style={styles.header}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{t("walletPages.faqTitle")}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        <Text style={styles.lead}>{t("walletPages.faqLead")}</Text>
        {faq.map((item, i) => {
          const isOpen = open === i;
          return (
            <Pressable
              key={item.q}
              style={styles.row}
              onPress={() => setOpen(isOpen ? null : i)}
            >
              <View style={styles.rowHead}>
                <Text style={styles.q}>{item.q}</Text>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={pal.muted} />
              </View>
              {isOpen ? <Text style={styles.a}>{item.a}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createFaqStyles(pal: ShellTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: pal.bg, paddingHorizontal: scale(16) },
    header: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(16) },
    back: {
      width: scale(40),
      height: scale(40),
      borderRadius: moderateScale(20),
      backgroundColor: pal.card,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize(17),
      fontWeight: "800",
      color: pal.fg,
    },
    lead: { fontSize: fontSize(13), color: pal.muted, marginBottom: verticalScale(6) },
    row: {
      backgroundColor: pal.card,
      borderRadius: moderateScale(18),
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(14),
    },
    rowHead: { flexDirection: "row", alignItems: "center", gap: moderateScale(10) },
    q: { flex: 1, fontSize: fontSize(14), fontWeight: "700", color: pal.fg },
    a: { marginTop: verticalScale(10), fontSize: fontSize(13), lineHeight: fontSize(19), color: pal.muted },
  });
}
