import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import type { MorphAiPrivacyDataCounts, MorphChatLimits } from "../../api/ai";
import {
  deleteMorphAiPrivacyData,
  fetchMorphAiPrivacy,
  fetchMorphChatLimits,
  patchMorphAiPrivacy,
} from "../../api/ai";
import { displayName, initials } from "../../api/user";
import { useAuth } from "../../auth/AuthContext";
import type { MorphChatThread } from "../../hooks/useMorphChat";
import {
  DEFAULT_MORPH_CHAT_PREFS,
  defaultVoiceForGender,
  morphChatUsagePercent,
  readMorphChatLimitsSnapshot,
  readMorphChatPrefs,
  writeMorphChatPrefs,
  type MorphChatAdviceGender,
  type MorphChatPrefs,
  type MorphChatReplyLang,
  type MorphChatReplyStyle,
  type MorphVoiceGenderPref,
  type MorphVoiceId,
  type MorphVoiceLangPref,
} from "../../lib/morph-chat-prefs";
import { MORPH_VOICE_CATALOG } from "../../lib/morph-voice";
import {
  MorphHelpCenterView,
  MorphReportProblemView,
  MorphTicketThreadView,
} from "./MorphChatSupport";

type Props = {
  limits: MorphChatLimits | null;
  threadCount: number;
  threads: MorphChatThread[];
  onClose: () => void;
  onClearAllChats: () => void;
  onOpenSubscription: () => void;
  onSaveHistoryOff?: () => void;
  onPreviewVoice?: (voiceId: MorphVoiceId) => void;
  voicePreviewing?: boolean;
};

type Page = "hub" | "reply" | "chatbot" | "voice" | "limits" | "data" | "help" | "report" | "ticket";

type ChipOption<T extends string> = { value: T; label: string };

const BG = "#000000";
const CARD = "#1C1C1E";
const LINE = "rgba(84, 84, 88, 0.65)";
const MUTED = "#8E8E93";
const ACCENT_BLUE = "#0A84FF";
const AVATAR_TEAL = "#2A9B8F";
const DESTRUCTIVE = "#FF453A";
const WARN = "#FF9F0A";
const EMPTY_COUNTS: MorphAiPrivacyDataCounts = {
  chat_threads: 0,
  chat_messages: 0,
  looks: 0,
  selfies: 0,
  shares: 0,
};

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

function SettingsSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function SettingsItem({
  icon,
  title,
  subtitle,
  trailing,
  value,
  onPress,
  last,
  titleColor,
  iconColor,
  showChevron = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  value?: string;
  onPress?: () => void;
  last?: boolean;
  titleColor?: string;
  iconColor?: string;
  showChevron?: boolean;
}) {
  const body = (
    <View style={styles.item}>
      <Ionicons name={icon} size={22} color={iconColor ?? "#FFFFFF"} style={styles.itemIcon} />
      <View style={[styles.itemMain, !last && styles.itemBorder]}>
        <View style={styles.itemCopy}>
          <Text style={[styles.itemTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
          {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
        </View>
        {value ? <Text style={styles.itemValue}>{value}</Text> : null}
        {trailing}
        {onPress && showChevron ? (
          <Ionicons name="chevron-forward" size={18} color={MUTED} />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  );
}

function PrefToggle({
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
    <View style={styles.toggleRow}>
      <View style={[styles.toggleMain, !last && styles.itemBorder]}>
        <View style={styles.itemCopy}>
          <Text style={styles.itemTitle}>{title}</Text>
          <Text style={styles.itemSubtitle}>{subtitle}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: "#3A3A3C", true: ACCENT_BLUE }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#3A3A3C"
        />
      </View>
    </View>
  );
}

function FieldBlock({
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
    <View style={[styles.fieldBlock, !last && styles.fieldBorder]}>
      <Text style={styles.itemTitle}>{title}</Text>
      {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function CloseButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
    >
      <Ionicons name="close" size={20} color="#FFFFFF" />
    </Pressable>
  );
}

/** Morf AI chatbot sozlamalari — ChatGPT uslubidagi dark hub + ichki sahifalar. */
export function MorphChatSettingsScreen({
  limits,
  threadCount,
  threads,
  onClose,
  onClearAllChats,
  onOpenSubscription,
  onSaveHistoryOff,
  onPreviewVoice,
  voicePreviewing,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [page, setPage] = useState<Page>("hub");
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [ticketFrom, setTicketFrom] = useState<"help" | "report">("help");
  const [prefs, setPrefs] = useState<MorphChatPrefs | null>(null);
  const [snap, setSnap] = useState<MorphChatLimits | null>(limits);
  const [counts, setCounts] = useState<MorphAiPrivacyDataCounts>(EMPTY_COUNTS);
  const [dataBusy, setDataBusy] = useState(false);
  const [privacySynced, setPrivacySynced] = useState(false);

  const name = useMemo(() => displayName(user), [user]);
  const letters = useMemo(() => initials(name), [name]);
  const email = user?.display_email || user?.email || "";

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
      try {
        const remote = await fetchMorphAiPrivacy();
        if (cancelled) return;
        setCounts(remote.data);
        setSnap(remote.limits);
        setPrivacySynced(true);
      } catch {
        try {
          const remoteLimits = await fetchMorphChatLimits();
          if (!cancelled) setSnap(remoteLimits);
        } catch {
          /* offline */
        }
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
      const serverPatch: Parameters<typeof patchMorphAiPrivacy>[0] = {};
      if (patch.privacyLocalOnly !== undefined) {
        serverPatch.privacy_local_only = patch.privacyLocalOnly;
      }
      if (patch.saveHistory !== undefined) serverPatch.save_chat_history = patch.saveHistory;
      if (patch.persistLooks !== undefined) serverPatch.persist_looks = patch.persistLooks;
      if (patch.limitNotify !== undefined) serverPatch.limit_notify = patch.limitNotify;
      if (patch.useTryOnContext !== undefined) {
        serverPatch.use_tryon_context = patch.useTryOnContext;
      }
      if (Object.keys(serverPatch).length) {
        try {
          const remote = await patchMorphAiPrivacy(serverPatch);
          setCounts(remote.data);
          setSnap(remote.limits);
          setPrivacySynced(true);
        } catch {
          /* offline — local qoladi */
        }
      }
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

  const wipeServerKind = useCallback(
    (kind: "chats" | "looks" | "selfies" | "shares" | "all", title: string, body: string) => {
      Alert.alert(title, body, [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("chat.settings.clearConfirm"),
          style: "destructive",
          onPress: () => {
            void (async () => {
              setDataBusy(true);
              try {
                const remote = await deleteMorphAiPrivacyData(kind);
                setCounts(remote.data);
                if (kind === "chats" || kind === "all") onClearAllChats();
              } catch {
                Alert.alert(title, t("chat.settings.dataFail"));
              } finally {
                setDataBusy(false);
              }
            })();
          },
        },
      ]);
    },
    [onClearAllChats, t],
  );

  const togglePrivacyLocal = useCallback(
    (value: boolean) => {
      if (value) {
        Alert.alert(t("chat.settings.privacyOnTitle"), t("chat.settings.privacyOnBody"), [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("chat.settings.privacyOnConfirm"),
            onPress: () => void patchPrefs({ privacyLocalOnly: true }),
          },
        ]);
        return;
      }
      void patchPrefs({ privacyLocalOnly: false });
    },
    [patchPrefs, t],
  );

  const usagePct = morphChatUsagePercent(snap);
  const used = snap?.token_used ?? snap?.daily_used;
  const limit = snap?.token_limit ?? snap?.daily_limit ?? 10000;
  const remaining =
    snap?.token_remaining ??
    snap?.daily_remaining ??
    (typeof used === "number" ? Math.max(0, limit - used) : null);
  const usedLabel =
    typeof used === "number" ? used.toLocaleString("uz-UZ") : t("chat.settings.limitUnknown");
  const remainingLabel =
    typeof remaining === "number"
      ? remaining.toLocaleString("uz-UZ")
      : t("chat.settings.limitUnknown");
  const limitLabel = limit.toLocaleString("uz-UZ");

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
  const voiceGenderOptions: ChipOption<MorphVoiceGenderPref>[] = [
    { value: "male", label: t("chat.settings.voiceMale") },
    { value: "female", label: t("chat.settings.voiceFemale") },
  ];
  const voiceLangOptions: ChipOption<MorphVoiceLangPref>[] = [
    { value: "auto", label: t("chat.settings.voiceLangAuto") },
    { value: "uz", label: t("chat.settings.langUz") },
    { value: "ru", label: t("chat.settings.langRu") },
  ];

  const pageTitle =
    page === "reply"
      ? t("chat.settings.replyGroup")
      : page === "chatbot"
        ? t("chat.settings.aiGroup")
        : page === "voice"
          ? t("chat.settings.voiceInput")
          : page === "limits"
            ? t("chat.settings.limitTitle")
            : page === "data"
              ? t("chat.settings.dataGroup")
          : page === "help"
          ? t("chat.settings.helpCenter")
          : page === "report"
            ? t("chat.settings.reportProblem")
            : page === "ticket"
              ? t("chat.support.ticketTitle")
              : t("chat.settings.title");

  const onBack = () => {
    if (page === "hub") onClose();
    else if (page === "ticket") setPage(ticketFrom);
    else setPage("hub");
  };

  const openTicket = (id: number, from: "help" | "report") => {
    setTicketFrom(from);
    setTicketId(id);
    setPage("ticket");
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <StatusBar style="light" />

      {page === "hub" ? (
        <View style={styles.hubTop}>
          <View style={styles.hubTopSpacer} />
          <CloseButton onPress={onClose} label={t("chat.errorDismissA11y")} />
        </View>
      ) : (
        <View style={styles.subTop}>
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.subTitle} numberOfLines={1}>
            {pageTitle}
          </Text>
          <CloseButton onPress={onClose} label={t("chat.errorDismissA11y")} />
        </View>
      )}

      {page === "ticket" && ticketId ? (
        <View style={[styles.content, { flex: 1, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <MorphTicketThreadView ticketId={ticketId} />
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 28) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {page === "hub" ? (
          <>
            <View style={styles.profileBlock}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{letters}</Text>
                </View>
                <View style={styles.editBadge} accessibilityElementsHidden>
                  <Ionicons name="pencil" size={12} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.profileName}>{name}</Text>
            </View>

            {!prefs ? (
              <ActivityIndicator color="#FFFFFF" style={{ marginTop: 28 }} />
            ) : (
              <>
                <SettingsSection title={t("chat.settings.configureGroup")}>
                  <SettingsItem
                    icon="happy-outline"
                    title={t("chat.settings.personalization")}
                    onPress={() => setPage("reply")}
                    last
                  />
                </SettingsSection>

                <SettingsSection title={t("chat.settings.accountGroup")}>
                  <SettingsItem
                    icon="mail-outline"
                    title={t("chat.settings.email")}
                    subtitle={email || t("chat.settings.emailEmpty")}
                    showChevron={false}
                  />
                  <SettingsItem
                    icon="speedometer-outline"
                    title={t("chat.settings.limitTitle")}
                    subtitle={t("chat.settings.limitValue", { used: usedLabel, limit: limitLabel })}
                    value={`${usagePct}%`}
                    onPress={() => setPage("limits")}
                  />
                  <SettingsItem
                    icon="sparkles"
                    title={t("chat.settings.upgradePlan")}
                    onPress={onOpenSubscription}
                    titleColor={ACCENT_BLUE}
                    iconColor={ACCENT_BLUE}
                    last
                  />
                </SettingsSection>

                <SettingsSection title={t("chat.settings.appSettingsGroup")}>
                  <SettingsItem
                    icon="notifications-outline"
                    title={t("chat.settings.limitNotify")}
                    subtitle={
                      prefs.limitNotify
                        ? t("chat.settings.limitNotifyOn")
                        : t("chat.settings.limitNotifyOff")
                    }
                    onPress={() => setPage("limits")}
                  />
                  <SettingsItem
                    icon="mic-outline"
                    title={t("chat.settings.voiceInput")}
                    subtitle={
                      prefs.voiceInput
                        ? t("chat.settings.voiceOn")
                        : t("chat.settings.voiceOff")
                    }
                    onPress={() => setPage("voice")}
                  />
                  <SettingsItem
                    icon="shield-outline"
                    title={t("chat.settings.privacyLocal")}
                    subtitle={
                      prefs.privacyLocalOnly
                        ? t("chat.settings.privacyOn")
                        : t("chat.settings.privacyOff")
                    }
                    onPress={() => setPage("data")}
                  />
                  <SettingsItem
                    icon="folder-outline"
                    title={t("chat.settings.dataGroup")}
                    subtitle={t("chat.settings.dataHubHint", {
                      chats: counts.chat_threads,
                      looks: counts.looks,
                    })}
                    onPress={() => setPage("data")}
                    last
                  />
                </SettingsSection>

                <SettingsSection title={t("chat.settings.helpGroup")}>
                  <SettingsItem
                    icon="flag-outline"
                    title={t("chat.settings.reportProblem")}
                    onPress={() => setPage("report")}
                  />
                  <SettingsItem
                    icon="help-circle-outline"
                    title={t("chat.settings.helpCenter")}
                    onPress={() => setPage("help")}
                    last
                  />
                </SettingsSection>

                <View style={styles.card}>
                  <Pressable
                    onPress={confirmClear}
                    style={({ pressed }) => [styles.destructiveRow, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={22} color={DESTRUCTIVE} />
                    <Text style={styles.destructiveText}>
                      {t("chat.settings.clearChats")}
                      {threadCount > 0 ? ` · ${threadCount}` : ""}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </>
        ) : null}

        {page === "reply" && prefs ? (
          <SettingsSection>
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
              last
            >
              <ChipRow
                options={genderOptions}
                value={prefs.adviceGender}
                onChange={(v) => void patchPrefs({ adviceGender: v })}
              />
            </FieldBlock>
          </SettingsSection>
        ) : null}

        {page === "voice" && prefs ? (
          <>
            <SettingsSection>
              <PrefToggle
                title={t("chat.settings.voiceInput")}
                subtitle={t("chat.settings.voiceInputHint")}
                value={prefs.voiceInput}
                onChange={(v) => void patchPrefs({ voiceInput: v })}
              />
              <PrefToggle
                title={t("chat.settings.autoSpeak")}
                subtitle={t("chat.settings.autoSpeakHint")}
                value={prefs.autoSpeak}
                onChange={(v) => void patchPrefs({ autoSpeak: v })}
              />
              <PrefToggle
                title={t("chat.settings.conversationMode")}
                subtitle={t("chat.settings.conversationModeHint")}
                value={prefs.conversationMode}
                onChange={(v) => void patchPrefs({ conversationMode: v })}
                last
              />
            </SettingsSection>
            <SettingsSection title={t("chat.settings.voiceModel")}>
              <FieldBlock
                title={t("chat.settings.voiceGender")}
                subtitle={t("chat.settings.voiceGenderHint")}
              >
                <ChipRow
                  options={voiceGenderOptions}
                  value={prefs.voiceGender}
                  onChange={(v) =>
                    void patchPrefs({
                      voiceGender: v,
                      voiceId: defaultVoiceForGender(v),
                    })
                  }
                />
              </FieldBlock>
              <FieldBlock
                title={t("chat.settings.voiceLang")}
                subtitle={t("chat.settings.voiceLangHint")}
                last
              >
                <ChipRow
                  options={voiceLangOptions}
                  value={prefs.voiceLang}
                  onChange={(v) => void patchPrefs({ voiceLang: v })}
                />
              </FieldBlock>
            </SettingsSection>
            <SettingsSection title={t("chat.settings.voicePick")}>
              {MORPH_VOICE_CATALOG.filter((row) => row.gender === prefs.voiceGender).map(
                (row, index, arr) => {
                  const active = prefs.voiceId === row.id;
                  const last = index === arr.length - 1;
                  return (
                    <View key={row.id} style={[styles.voiceRow, !last && styles.itemBorder]}>
                      <Pressable
                        onPress={() => void patchPrefs({ voiceId: row.id })}
                        style={({ pressed }) => [styles.voiceMain, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <View style={styles.itemCopy}>
                          <Text style={styles.itemTitle}>{t(row.nameKey)}</Text>
                          <Text style={styles.itemSubtitle}>{t(row.hintKey)}</Text>
                        </View>
                        {active ? (
                          <Ionicons name="checkmark-circle" size={22} color={ACCENT_BLUE} />
                        ) : (
                          <View style={styles.voiceDot} />
                        )}
                      </Pressable>
                      {onPreviewVoice ? (
                        <Pressable
                          onPress={() => onPreviewVoice(row.id)}
                          disabled={voicePreviewing}
                          style={({ pressed }) => [styles.previewBtn, pressed && styles.pressed]}
                          accessibilityRole="button"
                          accessibilityLabel={t("chat.settings.voicePreview")}
                        >
                          <Ionicons
                            name={voicePreviewing && active ? "hourglass-outline" : "play"}
                            size={16}
                            color="#FFFFFF"
                          />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                },
              )}
            </SettingsSection>
          </>
        ) : null}

        {page === "help" ? (
          <MorphHelpCenterView onOpenTicket={(id) => openTicket(id, "help")} />
        ) : null}

        {page === "report" ? (
          <MorphReportProblemView onOpenTicket={(id) => openTicket(id, "report")} />
        ) : null}

        {page === "limits" && prefs ? (
          <>
            {typeof remaining === "number" && remaining <= 3 ? (
              <View style={styles.warnBanner}>
                <Ionicons name="warning-outline" size={18} color={WARN} />
                <Text style={styles.warnText}>
                  {t("chat.settings.limitWarn", { remaining: remainingLabel, limit: limitLabel })}
                </Text>
              </View>
            ) : (
              <View style={styles.okBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#30D158" />
                <Text style={styles.okText}>
                  {t("chat.settings.limitOk", { remaining: remainingLabel, limit: limitLabel })}
                </Text>
              </View>
            )}
            <SettingsSection title={t("chat.settings.limitTitle")}>
              <View style={styles.meterBlock}>
                <Text style={styles.itemTitle}>
                  {t("chat.settings.limitValue", { used: usedLabel, limit: limitLabel })}
                </Text>
                <Text style={styles.itemSubtitle}>
                  {t("chat.settings.limitHint", { remaining: remainingLabel })}
                </Text>
                <View style={styles.meterTrack}>
                  <View
                    style={[
                      styles.meterFill,
                      {
                        width: `${usagePct}%`,
                        backgroundColor: usagePct >= 90 ? DESTRUCTIVE : usagePct >= 70 ? WARN : ACCENT_BLUE,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.meterPct}>{usagePct}%</Text>
              </View>
            </SettingsSection>
            <SettingsSection>
              <PrefToggle
                title={t("chat.settings.limitNotify")}
                subtitle={t("chat.settings.limitNotifyHint")}
                value={prefs.limitNotify}
                onChange={(v) => void patchPrefs({ limitNotify: v })}
                last
              />
            </SettingsSection>
            <SettingsSection>
              <SettingsItem
                icon="sparkles"
                title={t("chat.settings.upgradePlan")}
                subtitle={t("chat.settings.subscriptionHint")}
                onPress={onOpenSubscription}
                titleColor={ACCENT_BLUE}
                iconColor={ACCENT_BLUE}
                last
              />
            </SettingsSection>
          </>
        ) : null}

        {page === "data" && prefs ? (
          <>
            <Text style={styles.pageLead}>{t("chat.settings.dataLead")}</Text>
            <SettingsSection title={t("chat.settings.dataServer")}>
              <SettingsItem
                icon="chatbubbles-outline"
                title={t("chat.settings.dataChats")}
                value={String(counts.chat_threads)}
                showChevron={false}
              />
              <SettingsItem
                icon="images-outline"
                title={t("chat.settings.dataLooks")}
                value={String(counts.looks)}
                showChevron={false}
              />
              <SettingsItem
                icon="camera-outline"
                title={t("chat.settings.dataSelfies")}
                value={String(counts.selfies)}
                showChevron={false}
              />
              <SettingsItem
                icon="share-outline"
                title={t("chat.settings.dataShares")}
                value={String(counts.shares)}
                showChevron={false}
                last
              />
            </SettingsSection>
            {!privacySynced ? (
              <Text style={styles.syncHint}>{t("chat.settings.dataOffline")}</Text>
            ) : null}
            <SettingsSection title={t("chat.settings.privacyGroup")}>
              <PrefToggle
                title={t("chat.settings.privacyLocal")}
                subtitle={t("chat.settings.privacyLocalHint")}
                value={prefs.privacyLocalOnly}
                onChange={togglePrivacyLocal}
              />
              <PrefToggle
                title={t("chat.settings.saveHistory")}
                subtitle={t("chat.settings.saveHistoryHint")}
                value={prefs.saveHistory}
                onChange={(v) => void patchPrefs({ saveHistory: v })}
              />
              <PrefToggle
                title={t("chat.settings.persistLooks")}
                subtitle={t("chat.settings.persistLooksHint")}
                value={prefs.persistLooks}
                onChange={(v) => void patchPrefs({ persistLooks: v })}
                last
              />
            </SettingsSection>
            <SettingsSection title={t("chat.settings.dataActions")}>
              <SettingsItem
                icon="download-outline"
                title={t("chat.settings.exportChats")}
                subtitle={t("chat.settings.exportChatsHint", { count: threadCount })}
                onPress={() => void exportChats()}
              />
              <SettingsItem
                icon="trash-outline"
                title={t("chat.settings.deleteServerChats")}
                subtitle={t("chat.settings.deleteServerChatsHint", {
                  count: counts.chat_threads,
                })}
                titleColor={DESTRUCTIVE}
                iconColor={DESTRUCTIVE}
                onPress={() =>
                  wipeServerKind(
                    "chats",
                    t("chat.settings.deleteServerChats"),
                    t("chat.settings.deleteServerChatsBody"),
                  )
                }
              />
              <SettingsItem
                icon="trash-outline"
                title={t("chat.settings.deleteLooks")}
                subtitle={t("chat.settings.deleteLooksHint", { count: counts.looks })}
                titleColor={DESTRUCTIVE}
                iconColor={DESTRUCTIVE}
                onPress={() =>
                  wipeServerKind(
                    "looks",
                    t("chat.settings.deleteLooks"),
                    t("chat.settings.deleteLooksBody"),
                  )
                }
              />
              <SettingsItem
                icon="trash-outline"
                title={t("chat.settings.deleteSelfies")}
                subtitle={t("chat.settings.deleteSelfiesHint", { count: counts.selfies })}
                titleColor={DESTRUCTIVE}
                iconColor={DESTRUCTIVE}
                onPress={() =>
                  wipeServerKind(
                    "selfies",
                    t("chat.settings.deleteSelfies"),
                    t("chat.settings.deleteSelfiesBody"),
                  )
                }
                last
              />
            </SettingsSection>
            {dataBusy ? (
              <ActivityIndicator color="#FFFFFF" style={{ marginTop: 12 }} />
            ) : null}
          </>
        ) : null}

        {page === "chatbot" && prefs ? (
          <SettingsSection>
            <PrefToggle
              title={t("chat.settings.streaming")}
              subtitle={t("chat.settings.streamingHint")}
              value={prefs.streaming}
              onChange={(v) => void patchPrefs({ streaming: v })}
            />
            <PrefToggle
              title={t("chat.settings.useContext")}
              subtitle={t("chat.settings.useContextHint")}
              value={prefs.useTryOnContext}
              onChange={(v) => void patchPrefs({ useTryOnContext: v })}
              last
            />
          </SettingsSection>
        ) : null}

      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  hubTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 4,
    minHeight: 44,
  },
  hubTopSpacer: { flex: 1 },
  subTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 8,
    minHeight: 44,
  },
  subTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 0,
  },
  profileBlock: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 28,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: AVATAR_TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2C2C2E",
    borderWidth: 2,
    borderColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: "400",
    color: MUTED,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: "hidden",
  },
  item: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: 14,
    minHeight: 52,
  },
  itemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingRight: 14,
    gap: 6,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  itemIcon: {
    width: 28,
    marginTop: 15,
    textAlign: "center",
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: "400",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: MUTED,
    lineHeight: 17,
  },
  itemValue: {
    fontSize: 16,
    color: MUTED,
    marginRight: 2,
  },
  toggleRow: {
    paddingLeft: 16,
  },
  toggleMain: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 14,
    gap: 10,
    minHeight: 64,
  },
  destructiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  destructiveText: {
    fontSize: 17,
    fontWeight: "400",
    color: DESTRUCTIVE,
  },
  fieldBlock: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  fieldBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#2C2C2E",
  },
  chipActive: {
    backgroundColor: "#FFFFFF",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EBEBF5",
  },
  chipTextActive: {
    color: "#000000",
  },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 10,
    minHeight: 64,
    gap: 8,
  },
  voiceMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  voiceDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#3A3A3C",
  },
  previewBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  warnBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 159, 10, 0.16)",
  },
  warnText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: WARN,
    fontWeight: "600",
  },
  okBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(48, 209, 88, 0.12)",
  },
  okText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: "#30D158",
    fontWeight: "500",
  },
  meterBlock: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2C2C2E",
    overflow: "hidden",
    marginTop: 6,
  },
  meterFill: {
    height: 8,
    borderRadius: 4,
  },
  meterPct: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  pageLead: {
    marginBottom: 16,
    marginHorizontal: 4,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  syncHint: {
    marginTop: -12,
    marginBottom: 16,
    marginHorizontal: 12,
    fontSize: 12,
    color: MUTED,
  },
  pressed: {
    opacity: 0.72,
  },
});
