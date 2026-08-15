import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
import {
  readMorphChatLimitsSnapshot,
  readMorphChatPrefs,
  writeMorphChatPrefs,
  type MorphChatPrefs,
} from "../../lib/morph-chat-prefs";
import { colors } from "../../theme/colors";

type Props = {
  limits: MorphChatLimits | null;
  threadCount: number;
  onClose: () => void;
  onClearAllChats: () => void;
  onOpenSubscription: () => void;
  onSaveHistoryOff?: () => void;
};

/** Morf AI chatbot sozlamalari — limit, kontekst va tarix. */
export function MorphChatSettingsScreen({
  limits,
  threadCount,
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
        const base = prev ?? { useTryOnContext: true, saveHistory: true };
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

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <NativeHeader title={t("chat.settings.title")} onBack={onClose} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.limitCard}>
          <View style={styles.limitIcon}>
            <Ionicons name="flash-outline" size={20} color="#111111" />
          </View>
          <View style={styles.limitCopy}>
            <Text style={styles.limitTitle}>{t("chat.settings.limitTitle")}</Text>
            <Text style={styles.limitValue}>
              {t("chat.settings.limitValue", {
                used: usedLabel,
                limit,
              })}
            </Text>
            <Text style={styles.limitHint}>
              {t("chat.settings.limitHint", { remaining: remainingLabel })}
            </Text>
          </View>
        </View>

        {!prefs ? (
          <ActivityIndicator color={colors.fg} style={{ marginTop: 24 }} />
        ) : (
          <>
            <SettingsGroup title={t("chat.settings.aiGroup")}>
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
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    marginBottom: 14,
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
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
  },
  limitHint: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: "#52525B",
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
