import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MorphChatLimits } from "../../api/ai";
import { NativeHeader } from "../../components/ui/NativeHeader";
import type { MorphChatThread } from "../../hooks/useMorphChat";
import {
  DEFAULT_MORPH_CHAT_PREFS,
  morphChatUsagePercent,
  readMorphChatLimitsSnapshot,
  readMorphChatPrefs,
  writeMorphChatPrefs,
  type MorphChatAdviceGender,
  type MorphChatPrefs,
  type MorphChatReplyLang,
  type MorphChatReplyStyle,
} from "../../lib/morph-chat-prefs";
import { colors } from "../../theme/colors";

type Props = {
  limits: MorphChatLimits | null;
  threadCount: number;
  threads: MorphChatThread[];
  onClose: () => void;
  onClearAllChats: () => void;
  onOpenSubscription: () => void;
  onOpenReferral?: () => void;
  onSaveHistoryOff?: () => void;
};

type Page = "hub" | "reply" | "chatbot" | "plan";

type ChipOption<T extends string> = { value: T; label: string };

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function HubTile({
  icon,
  title,
  subtitle,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  accent?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={[styles.tileIcon, accent ? { backgroundColor: accent } : null]}>
        <Ionicons name={icon} size={20} color={accent ? "#111" : "#FFFFFF"} />
      </View>
      <View style={styles.tileCopy}>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
    </Pressable>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
  last,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.toggleRow, !last && styles.toggleBorder]}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSub}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#E4E4E7", true: "#111111" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function FieldBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldTitle}>{title}</Text>
      {subtitle ? <Text style={styles.fieldSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

/** Morf AI chatbot sozlamalari — hub + ichki sahifalar. */
export function MorphChatSettingsScreen({
  limits,
  threadCount,
  threads,
  onClose,
  onClearAllChats,
  onOpenSubscription,
  onOpenReferral,
  onSaveHistoryOff,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<Page>("hub");
  const [prefs, setPrefs] = useState<MorphChatPrefs | null>(null);
  const [snap, setSnap] = useState<MorphChatLimits | null>(limits);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [p, stored] = await Promise.all([
        readMorphChatPrefs(),
        readMorphChatLimitsSnapshot(),
      ]);
      if (cancelled) return;
      setPrefs(p);
      if (limits) setSnap(limits);
      else if (stored) {
        setSnap({
          daily_limit: stored.daily_limit,
          daily_used: stored.daily_used,
          daily_remaining: stored.daily_remaining,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limits]);

  useEffect(() => {
    if (limits) setSnap(limits);
  }, [limits]);

  const patchPrefs = useCallback(
    async (patch: Partial<MorphChatPrefs>) => {
      setPrefs((prev) => {
        const base = prev ?? { ...DEFAULT_MORPH_CHAT_PREFS };
        const next = { ...base, ...patch };
        void writeMorphChatPrefs(next);
        return next;
      });
      if (patch.saveHistory === false) onSaveHistoryOff?.();
    },
    [onSaveHistoryOff],
  );

  const confirmClear = useCallback(() => {
    Alert.alert(t("chat.settings.clearTitle"), t("chat.settings.clearBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("chat.settings.clearConfirm"),
        style: "destructive",
        onPress: onClearAllChats,
      },
    ]);
  }, [onClearAllChats, t]);

  const exportChats = useCallback(async () => {
    if (!threads.length) {
      Alert.alert(t("chat.settings.exportTitle"), t("chat.settings.exportEmpty"));
      return;
    }
    const blocks = threads.map((th, i) => {
      const lines = th.messages
        .filter((m) => m.content.trim())
        .map((m) => `${m.role === "user" ? "Siz" : "Morf"}: ${m.content.trim()}`);
      return `${i + 1}. ${th.title}\n${lines.join("\n")}`;
    });
    const message = `Morf AI\n\n${blocks.join("\n\n---\n\n")}`;
    try {
      await Share.share({ message, title: t("chat.settings.exportTitle") });
    } catch {
      Alert.alert(t("chat.settings.exportTitle"), t("chat.settings.exportFail"));
    }
  }, [t, threads]);

  const usagePct = morphChatUsagePercent(snap);
  const used = snap?.daily_used;
  const limit = snap?.daily_limit ?? 40;
  const remaining =
    snap?.daily_remaining ??
    (typeof used === "number" ? Math.max(0, limit - used) : null);
  const usedLabel =
    typeof used === "number" ? String(used) : t("chat.settings.limitUnknown");
  const remainingLabel =
    typeof remaining === "number"
      ? String(remaining)
      : t("chat.settings.limitUnknown");

  const langOptions: ChipOption<MorphChatReplyLang>[] = [
    { value: "app", label: t("chat.settings.langApp") },
    { value: "uz", label: t("chat.settings.langUz") },
    { value: "ru", label: t("chat.settings.langRu") },
  ];
  const styleOptions: ChipOption<MorphChatReplyStyle>[] = [
    { value: "short", label: t("chat.settings.styleShort") },
    { value: "detailed", label: t("chat.settings.styleDetailed") },
    { value: "barber", label: t("chat.settings.styleBarber") },
  ];
  const genderOptions: ChipOption<MorphChatAdviceGender>[] = [
    { value: "auto", label: t("chat.settings.genderAuto") },
    { value: "male", label: t("chat.settings.genderMale") },
    { value: "female", label: t("chat.settings.genderFemale") },
  ];

  const pageTitle =
    page === "reply"
      ? t("chat.settings.replyGroup")
      : page === "chatbot"
        ? t("chat.settings.aiGroup")
        : page === "plan"
          ? t("chat.settings.planGroup")
          : t("chat.settings.title");

  const onBack = () => {
    if (page === "hub") onClose();
    else setPage("hub");
  };

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <NativeHeader title={pageTitle} onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {page === "hub" ? (
          <>
            <View style={styles.usageHero}>
              <View style={styles.usageRing}>
                <Text style={styles.usagePct}>{usagePct}%</Text>
              </View>
              <View style={styles.usageCopy}>
                <Text style={styles.usageKicker}>{t("chat.settings.limitTitle")}</Text>
                <Text style={styles.usageMain}>
                  {t("chat.settings.limitValue", { used: usedLabel, limit })}
                </Text>
                <Text style={styles.usageHint}>
                  {t("chat.settings.limitHint", { remaining: remainingLabel })}
                </Text>
              </View>
            </View>
            <View style={styles.usageBar}>
              <View style={[styles.usageFill, { width: `${usagePct}%` }]} />
            </View>

            {!prefs ? (
              <ActivityIndicator color={colors.fg} style={{ marginTop: 28 }} />
            ) : (
              <View style={styles.tileGrid}>
                <HubTile
                  icon="chatbubbles-outline"
                  title={t("chat.settings.replyGroup")}
                  subtitle={t("chat.settings.replyLangHint")}
                  onPress={() => setPage("reply")}
                  accent="#E8F0FF"
                />
                <HubTile
                  icon="sparkles-outline"
                  title={t("chat.settings.aiGroup")}
                  subtitle={t("chat.settings.streamingHint")}
                  onPress={() => setPage("chatbot")}
                  accent="#FFF1E8"
                />
                <HubTile
                  icon="diamond-outline"
                  title={t("chat.settings.planGroup")}
                  subtitle={t("chat.settings.subscriptionHint")}
                  onPress={() => setPage("plan")}
                  accent="#F3E8FF"
                />
              </View>
            )}

            <View style={styles.footActions}>
              <Pressable
                onPress={() => void exportChats()}
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              >
                <Ionicons name="share-outline" size={16} color="#52525B" />
                <Text style={styles.ghostText}>
                  {t("chat.settings.exportChats")}
                  {threadCount > 0 ? ` · ${threadCount}` : ""}
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmClear}
                style={({ pressed }) => [styles.clearLink, pressed && styles.pressed]}
              >
                <Text style={styles.clearText}>{t("chat.settings.clearChats")}</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {page === "reply" && prefs ? (
          <View style={styles.panel}>
            <FieldBlock
              title={t("chat.settings.replyLang")}
              subtitle={t("chat.settings.replyLangHint")}
            >
              <ChipRow
                options={langOptions}
                value={prefs.replyLang}
                onChange={(v) => void patchPrefs({ replyLang: v })}
              />
            </FieldBlock>
            <FieldBlock
              title={t("chat.settings.replyStyle")}
              subtitle={t("chat.settings.replyStyleHint")}
            >
              <ChipRow
                options={styleOptions}
                value={prefs.replyStyle}
                onChange={(v) => void patchPrefs({ replyStyle: v })}
              />
            </FieldBlock>
            <FieldBlock
              title={t("chat.settings.adviceGender")}
              subtitle={t("chat.settings.adviceGenderHint")}
            >
              <ChipRow
                options={genderOptions}
                value={prefs.adviceGender}
                onChange={(v) => void patchPrefs({ adviceGender: v })}
              />
            </FieldBlock>
          </View>
        ) : null}

        {page === "chatbot" && prefs ? (
          <View style={styles.panel}>
            <ToggleRow
              title={t("chat.settings.streaming")}
              subtitle={t("chat.settings.streamingHint")}
              value={prefs.streaming}
              onChange={(v) => void patchPrefs({ streaming: v })}
            />
            <ToggleRow
              title={t("chat.settings.voiceInput")}
              subtitle={t("chat.settings.voiceInputHint")}
              value={prefs.voiceInput}
              onChange={(v) => void patchPrefs({ voiceInput: v })}
            />
            <ToggleRow
              title={t("chat.settings.limitNotify")}
              subtitle={t("chat.settings.limitNotifyHint")}
              value={prefs.limitNotify}
              onChange={(v) => void patchPrefs({ limitNotify: v })}
            />
            <ToggleRow
              title={t("chat.settings.useContext")}
              subtitle={t("chat.settings.useContextHint")}
              value={prefs.useTryOnContext}
              onChange={(v) => void patchPrefs({ useTryOnContext: v })}
            />
            <ToggleRow
              title={t("chat.settings.saveHistory")}
              subtitle={t("chat.settings.saveHistoryHint")}
              value={prefs.saveHistory}
              onChange={(v) => void patchPrefs({ saveHistory: v })}
            />
            <ToggleRow
              title={t("chat.settings.privacyLocal")}
              subtitle={t("chat.settings.privacyLocalHint")}
              value={prefs.privacyLocalOnly}
              onChange={(v) => void patchPrefs({ privacyLocalOnly: v })}
              last
            />
          </View>
        ) : null}

        {page === "plan" ? (
          <View style={styles.panel}>
            <Pressable
              onPress={onOpenSubscription}
              style={({ pressed }) => [styles.planCard, pressed && styles.pressed]}
            >
              <View style={[styles.tileIcon, { backgroundColor: "#111111" }]}>
                <Ionicons name="diamond-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.tileCopy}>
                <Text style={styles.tileTitle}>{t("chat.settings.subscription")}</Text>
                <Text style={styles.tileSub}>{t("chat.settings.subscriptionHint")}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
            </Pressable>
            {onOpenReferral ? (
              <Pressable
                onPress={onOpenReferral}
                style={({ pressed }) => [styles.planCard, pressed && styles.pressed]}
              >
                <View style={[styles.tileIcon, { backgroundColor: "#FFF1E8" }]}>
                  <Ionicons name="people-outline" size={20} color="#111111" />
                </View>
                <View style={styles.tileCopy}>
                  <Text style={styles.tileTitle}>{t("chat.settings.referral")}</Text>
                  <Text style={styles.tileSub}>{t("chat.settings.referralHint")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A1A1AA" />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  usageHero: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  usageRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAFAFA",
  },
  usagePct: { fontSize: 16, fontWeight: "800", color: "#111111" },
  usageCopy: { flex: 1, minWidth: 0, gap: 2 },
  usageKicker: { fontSize: 12, fontWeight: "600", color: "#71717A" },
  usageMain: { fontSize: 18, fontWeight: "700", color: "#111111", letterSpacing: -0.3 },
  usageHint: { fontSize: 13, color: "#52525B" },
  usageBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E4E4E7",
    overflow: "hidden",
    marginBottom: 8,
  },
  usageFill: { height: "100%", backgroundColor: "#111111", borderRadius: 999 },
  tileGrid: { gap: 10, marginTop: 8 },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  tileCopy: { flex: 1, minWidth: 0, gap: 2 },
  tileTitle: { fontSize: 16, fontWeight: "700", color: "#111111" },
  tileSub: { fontSize: 12, lineHeight: 16, color: "#71717A" },
  footActions: { marginTop: 18, alignItems: "center", gap: 12 },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
  },
  ghostText: { fontSize: 13, fontWeight: "600", color: "#52525B" },
  clearLink: { paddingVertical: 4 },
  clearText: { fontSize: 12, fontWeight: "600", color: "#A1A1AA", textDecorationLine: "underline" },
  panel: {
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    overflow: "hidden",
    gap: 0,
  },
  fieldBlock: { padding: 14, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E4E4E7" },
  fieldTitle: { fontSize: 15, fontWeight: "700", color: "#111111" },
  fieldSub: { fontSize: 12, color: "#71717A", marginTop: -4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
  chipActive: { backgroundColor: "#111111" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#3F3F46" },
  chipTextActive: { color: "#FFFFFF" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E4E4E7" },
  toggleCopy: { flex: 1, minWidth: 0, gap: 2 },
  toggleTitle: { fontSize: 15, fontWeight: "600", color: "#111111" },
  toggleSub: { fontSize: 12, lineHeight: 16, color: "#71717A" },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E4E7",
  },
  pressed: { opacity: 0.82 },
});
