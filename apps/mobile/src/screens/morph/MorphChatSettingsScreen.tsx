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
import { SettingsGroup, SettingsRow } from "../../components/ui/SettingsKit";
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
  onSaveHistoryOff?: () => void;
};

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

function ChoiceBlock({
  title,
  subtitle,
  children,
  last,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.choiceBlock, !last && styles.choiceBorder]}>
      <Text style={styles.choiceTitle}>{title}</Text>
      {subtitle ? <Text style={styles.choiceSub}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

/** Morf AI chatbot sozlamalari — limit, uslub, maxfiylik. */
export function MorphChatSettingsScreen({
  limits,
  threadCount,
  threads,
  onClose,
  onClearAllChats,
  onOpenSubscription,
  onSaveHistoryOff,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <NativeHeader title={t("chat.settings.title")} onBack={onClose} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.limitCard}>
          <View style={styles.limitTop}>
            <View style={styles.limitIcon}>
              <Ionicons name="flash-outline" size={20} color="#111111" />
            </View>
            <View style={styles.limitCopy}>
              <Text style={styles.limitTitle}>{t("chat.settings.limitTitle")}</Text>
              <Text style={styles.limitValue}>
                {t("chat.settings.limitUsage", { pct: usagePct })}
              </Text>
            </View>
            <Text style={styles.limitPctBadge}>{usagePct}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${usagePct}%` }]} />
          </View>
          <View style={styles.limitScale}>
            <Text style={styles.limitScaleText}>0%</Text>
            <Text style={styles.limitScaleMid}>
              {t("chat.settings.limitValue", { used: usedLabel, limit })}
            </Text>
            <Text style={styles.limitScaleText}>100%</Text>
          </View>
          <Text style={styles.limitHint}>
            {t("chat.settings.limitHint", { remaining: remainingLabel })}
          </Text>
        </View>

        {!prefs ? (
          <ActivityIndicator color={colors.fg} style={{ marginTop: 24 }} />
        ) : (
          <>
            <SettingsGroup title={t("chat.settings.replyGroup")}>
              <ChoiceBlock
                title={t("chat.settings.replyLang")}
                subtitle={t("chat.settings.replyLangHint")}
              >
                <ChipRow
                  options={langOptions}
                  value={prefs.replyLang}
                  onChange={(v) => void patchPrefs({ replyLang: v })}
                />
              </ChoiceBlock>
              <ChoiceBlock
                title={t("chat.settings.replyStyle")}
                subtitle={t("chat.settings.replyStyleHint")}
              >
                <ChipRow
                  options={styleOptions}
                  value={prefs.replyStyle}
                  onChange={(v) => void patchPrefs({ replyStyle: v })}
                />
              </ChoiceBlock>
              <ChoiceBlock
                title={t("chat.settings.adviceGender")}
                subtitle={t("chat.settings.adviceGenderHint")}
                last
              >
                <ChipRow
                  options={genderOptions}
                  value={prefs.adviceGender}
                  onChange={(v) => void patchPrefs({ adviceGender: v })}
                />
              </ChoiceBlock>
            </SettingsGroup>

            <SettingsGroup title={t("chat.settings.aiGroup")}>
              <SettingsRow
                title={t("chat.settings.streaming")}
                subtitle={t("chat.settings.streamingHint")}
                icon="pulse-outline"
                trailing={
                  <Switch
                    value={prefs.streaming}
                    onValueChange={(v) => void patchPrefs({ streaming: v })}
                    trackColor={{ false: "#E4E4E7", true: "#111111" }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <SettingsRow
                title={t("chat.settings.voiceInput")}
                subtitle={t("chat.settings.voiceInputHint")}
                icon="mic-outline"
                trailing={
                  <Switch
                    value={prefs.voiceInput}
                    onValueChange={(v) => void patchPrefs({ voiceInput: v })}
                    trackColor={{ false: "#E4E4E7", true: "#111111" }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <SettingsRow
                title={t("chat.settings.limitNotify")}
                subtitle={t("chat.settings.limitNotifyHint")}
                icon="notifications-outline"
                trailing={
                  <Switch
                    value={prefs.limitNotify}
                    onValueChange={(v) => void patchPrefs({ limitNotify: v })}
                    trackColor={{ false: "#E4E4E7", true: "#111111" }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <SettingsRow
                title={t("chat.settings.useContext")}
                subtitle={t("chat.settings.useContextHint")}
                icon="scan-outline"
                trailing={
                  <Switch
                    value={prefs.useTryOnContext}
                    onValueChange={(v) => void patchPrefs({ useTryOnContext: v })}
                    trackColor={{ false: "#E4E4E7", true: "#111111" }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <SettingsRow
                title={t("chat.settings.saveHistory")}
                subtitle={t("chat.settings.saveHistoryHint")}
                icon="folder-outline"
                trailing={
                  <Switch
                    value={prefs.saveHistory}
                    onValueChange={(v) => void patchPrefs({ saveHistory: v })}
                    trackColor={{ false: "#E4E4E7", true: "#111111" }}
                    thumbColor="#FFFFFF"
                  />
                }
              />
              <SettingsRow
                title={t("chat.settings.privacyLocal")}
                subtitle={t("chat.settings.privacyLocalHint")}
                icon="shield-checkmark-outline"
                trailing={
                  <Switch
                    value={prefs.privacyLocalOnly}
                    onValueChange={(v) => void patchPrefs({ privacyLocalOnly: v })}
                    trackColor={{ false: "#E4E4E7", true: "#111111" }}
                    thumbColor="#FFFFFF"
                  />
                }
                last
              />
            </SettingsGroup>

            <SettingsGroup title={t("chat.settings.planGroup")}>
              <SettingsRow
                title={t("chat.settings.subscription")}
                subtitle={t("chat.settings.subscriptionHint")}
                icon="diamond-outline"
                onPress={onOpenSubscription}
                last
              />
            </SettingsGroup>

            <SettingsGroup title={t("chat.settings.dataGroup")}>
              <SettingsRow
                title={t("chat.settings.exportChats")}
                subtitle={t("chat.settings.exportChatsHint", { count: threadCount })}
                icon="share-outline"
                onPress={() => void exportChats()}
              />
              <SettingsRow
                title={t("chat.settings.clearChats")}
                subtitle={t("chat.settings.clearChatsHint", { count: threadCount })}
                icon="trash-outline"
                destructive
                onPress={confirmClear}
                last
              />
            </SettingsGroup>
          </>
        )}

        <Pressable
          onPress={onClose}
          style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.doneText}>{t("chat.settings.done")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 4,
  },
  limitCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    marginBottom: 14,
    gap: 10,
  },
  limitTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  limitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  limitCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  limitTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717A",
  },
  limitValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
  },
  limitPctBadge: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.4,
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E4E4E7",
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#111111",
  },
  limitScale: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  limitScaleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#A1A1AA",
  },
  limitScaleMid: {
    fontSize: 12,
    fontWeight: "600",
    color: "#52525B",
  },
  limitHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#52525B",
  },
  choiceBlock: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  choiceBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E4E7",
  },
  choiceTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.fg,
  },
  choiceSub: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.muted,
    marginTop: -4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F4F4F5",
  },
  chipActive: {
    backgroundColor: "#111111",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3F3F46",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  doneBtn: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#111111",
  },
  doneText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
