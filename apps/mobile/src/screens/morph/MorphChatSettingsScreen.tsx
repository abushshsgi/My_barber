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
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MorphAiPrivacyDataCounts, MorphChatLimits } from "../../api/ai";
import { UsageBar, UsageMeter } from "../../components/morph/UsageMeter";
import { TelegramAppearancePanel } from "../../components/morph/TelegramAppearancePanel";
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
import { MorphToggle } from "../../components/morph/MorphToggle";
import { PersonalInfoPanel } from "../profile/PersonalInfoPanel";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { morphFont } from "../../theme/morph-font";
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
  onClearAllChats: () => void | Promise<void>;
  onOpenSubscription: () => void;
  onSaveHistoryOff?: () => void;
  onPreviewVoice?: (voiceId: MorphVoiceId) => void;
  voicePreviewing?: boolean;
};

type Page =
  | "hub"
  | "account"
  | "reply"
  | "chatbot"
  | "voice"
  | "limits"
  | "data"
  | "help"
  | "report"
  | "ticket"
  | "appearance";

type ChipOption<T extends string> = { value: T; label: string };

type ConfirmSpec = {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
};

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
  const { colors: pal } = useMorphAppearance();
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
              { backgroundColor: pal.iconTile },
              active && { backgroundColor: pal.theme === "dark" ? "#FFFFFF" : pal.fg },
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.chipText,
                { color: pal.fg },
                active && { color: pal.theme === "dark" ? "#000000" : pal.bg },
              ]}
            >
              {opt.label}
            </Text>
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
  const { colors: pal, fs } = useMorphAppearance();
  return (
    <View style={styles.section}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: pal.muted, fontSize: fs(12) }]}>{title}</Text>
      ) : null}
      <View
        style={[
          styles.card,
          {
            backgroundColor: pal.card,
            borderColor: pal.line,
            shadowOpacity: 0,
            elevation: 0,
          },
        ]}
      >
        {children}
      </View>
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
  const { colors: pal, fs } = useMorphAppearance();
  const body = (
    <View style={styles.item}>
      <View style={[styles.iconTile, { backgroundColor: pal.iconTile }]}>
        <Ionicons name={icon} size={20} color={iconColor ?? pal.fg} />
      </View>
      <View style={[styles.itemMain, !last && styles.itemBorder, !last && { borderBottomColor: pal.line }]}>
        <View style={styles.itemCopy}>
          <Text
            style={[
              styles.itemTitle,
              { color: titleColor ?? pal.fg, fontSize: fs(15) },
            ]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.itemSubtitle, { color: pal.muted, fontSize: fs(12) }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text style={[styles.itemValue, { color: pal.muted, fontSize: fs(14) }]}>{value}</Text>
        ) : null}
        {trailing}
        {onPress && showChevron ? (
          <Ionicons name="chevron-forward" size={16} color={pal.muted} />
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
  const { colors: pal, fs } = useMorphAppearance();
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleMain, !last && styles.itemBorder, !last && { borderBottomColor: pal.line }]}>
        <View style={styles.itemCopy}>
          <Text style={[styles.itemTitle, { color: pal.fg, fontSize: fs(15) }]}>{title}</Text>
          <Text style={[styles.itemSubtitle, { color: pal.muted, fontSize: fs(12) }]}>{subtitle}</Text>
        </View>
        <MorphToggle value={value} onChange={onChange} />
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
  const { colors: pal, fs } = useMorphAppearance();
  return (
    <View style={[styles.fieldBlock, !last && styles.fieldBorder, !last && { borderBottomColor: pal.line }]}>
      <Text style={[styles.itemTitle, { color: pal.fg, fontSize: fs(15) }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.itemSubtitle, { color: pal.muted, fontSize: fs(12) }]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

function CloseButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { colors: pal } = useMorphAppearance();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.closeBtn,
        { backgroundColor: pal.iconTile },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="close" size={18} color={pal.fg} />
    </Pressable>
  );
}

function ConfirmSheet({
  spec,
  busy,
  onCancel,
  onConfirm,
}: {
  spec: ConfirmSpec;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { colors: pal, fs } = useMorphAppearance();
  return (
    <View style={styles.confirmRoot} accessibilityViewIsModal>
      <Pressable style={styles.confirmScrim} onPress={busy ? undefined : onCancel} />
      <View style={[styles.confirmCard, { backgroundColor: pal.card }]}>
        <Text style={[styles.confirmTitle, { color: pal.fg, fontSize: fs(17) }]}>{spec.title}</Text>
        <Text style={[styles.confirmBody, { color: pal.muted, fontSize: fs(14) }]}>{spec.body}</Text>
        <View style={styles.confirmRow}>
          <Pressable
            onPress={onCancel}
            disabled={busy}
            style={({ pressed }) => [styles.confirmNo, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.confirmNoText}>{spec.cancelLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={busy}
            style={({ pressed }) => [styles.confirmYes, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.confirmYesText}>{spec.confirmLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Morf AI sozlamalari — ko'rinish, limit, maxfiylik, ovoz. Chat va butun Morph AI uchun. */
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
  const { colors: pal, fs } = useMorphAppearance();
  const [page, setPage] = useState<Page>("hub");
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [ticketFrom, setTicketFrom] = useState<"help" | "report">("help");
  const [prefs, setPrefs] = useState<MorphChatPrefs | null>(null);
  const [snap, setSnap] = useState<MorphChatLimits | null>(limits);
  const [counts, setCounts] = useState<MorphAiPrivacyDataCounts>(EMPTY_COUNTS);
  const [dataBusy, setDataBusy] = useState(false);
  const [privacySynced, setPrivacySynced] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
          setActionError(null);
        } catch (err) {
          setActionError(
            err instanceof Error && err.message.trim()
              ? err.message
              : t("chat.settings.dataFail"),
          );
        }
      }
    },
    [onSaveHistoryOff, t],
  );

  const confirmClear = useCallback(() => {
    setActionError(null);
    setConfirm({
      title: t("chat.settings.clearTitle"),
      body: t("chat.settings.clearBody"),
      confirmLabel: t("chat.settings.clearConfirm"),
      cancelLabel: t("chat.settings.clearCancel"),
      onConfirm: async () => {
        try {
          await onClearAllChats();
        } catch (err) {
          setActionError(
            err instanceof Error && err.message.trim()
              ? err.message
              : t("chat.settings.clearFail"),
          );
          throw err;
        }
      },
    });
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
      setActionError(null);
      setConfirm({
        title,
        body,
        confirmLabel: t("common.yes"),
        cancelLabel: t("common.no"),
        onConfirm: async () => {
          setDataBusy(true);
          try {
            const remote = await deleteMorphAiPrivacyData(kind);
            setCounts(remote.data);
            if (kind === "chats" || kind === "all") await onClearAllChats();
          } catch (err) {
            setActionError(
              err instanceof Error && err.message.trim()
                ? err.message
                : t("chat.settings.dataFail"),
            );
            throw err;
          } finally {
            setDataBusy(false);
          }
        },
      });
    },
    [onClearAllChats, t],
  );

  const togglePrivacyLocal = useCallback(
    (value: boolean) => {
      if (value) {
        setActionError(null);
        setConfirm({
          title: t("chat.settings.privacyOnTitle"),
          body: t("chat.settings.privacyOnBody"),
          confirmLabel: t("common.yes"),
          cancelLabel: t("common.no"),
          onConfirm: () => patchPrefs({ privacyLocalOnly: true }),
        });
        return;
      }
      void patchPrefs({ privacyLocalOnly: false });
    },
    [patchPrefs, t],
  );

  const usagePct = morphChatUsagePercent(snap);
  const nearlyEmpty = usagePct >= 90;
  const meterColor = usagePct >= 90 ? DESTRUCTIVE : usagePct >= 70 ? WARN : ACCENT_BLUE;

  const runConfirm = useCallback(() => {
    if (!confirm || confirmBusy) return;
    void (async () => {
      setConfirmBusy(true);
      try {
        await confirm.onConfirm();
        setConfirm(null);
      } catch {
        setConfirm(null);
      } finally {
        setConfirmBusy(false);
      }
    })();
  }, [confirm, confirmBusy]);

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
    page === "account"
      ? t("profile.personalInfo")
      : page === "reply"
      ? t("chat.settings.replyGroup")
      : page === "chatbot"
        ? t("chat.settings.aiGroup")
        : page === "voice"
          ? t("chat.settings.voiceInput")
          : page === "appearance"
            ? t("chat.settings.appearance")
          : page === "limits"
            ? t(
                snap?.period === "lifetime"
                  ? "chat.settings.limitTitleOnce"
                  : "chat.settings.limitTitle",
              )
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
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8), backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />

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
            <Ionicons name="chevron-back" size={20} color={pal.fg} />
          </Pressable>
          <Text style={[styles.subTitle, { color: pal.fg, fontSize: fs(15) }]} numberOfLines={1}>
            {pageTitle}
          </Text>
          <CloseButton onPress={onClose} label={t("chat.errorDismissA11y")} />
        </View>
      )}

      {page === "ticket" && ticketId ? (
        <View style={[styles.content, { flex: 1, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <MorphTicketThreadView ticketId={ticketId} />
        </View>
      ) : page === "appearance" ? (
        <TelegramAppearancePanel bottomInset={Math.max(insets.bottom, 16)} />
      ) : (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 28) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {actionError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={DESTRUCTIVE} />
            <Text style={styles.errorText}>{actionError}</Text>
          </View>
        ) : null}
        {page === "hub" ? (
          <>
            <View style={styles.profileBlock}>
              <Pressable
                onPress={() => setPage("account")}
                accessibilityRole="button"
                accessibilityLabel={t("profile.personalInfo")}
              >
                <View style={styles.avatarWrap}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{letters}</Text>
                  </View>
                  <View style={[styles.editBadge, { borderColor: pal.bg, backgroundColor: pal.cardStrong }]} accessibilityElementsHidden>
                    <Ionicons name="pencil" size={12} color={pal.fg} />
                  </View>
                </View>
              </Pressable>
              <Text style={[styles.profileName, { color: pal.fg, fontSize: fs(20) }]}>{name}</Text>
            </View>

            {!prefs ? (
              <ActivityIndicator color={pal.fg} style={{ marginTop: 28 }} />
            ) : (
              <>
                <SettingsSection title={t("chat.settings.configureGroup")}>
                  <SettingsItem
                    icon="options"
                    title={t("chat.settings.personalization")}
                    onPress={() => setPage("reply")}
                    last
                  />
                </SettingsSection>

                <SettingsSection title={t("chat.settings.accountGroup")}>
                  <SettingsItem
                    icon="mail"
                    title={t("chat.settings.email")}
                    subtitle={email || t("chat.settings.emailEmpty")}
                    showChevron={false}
                  />
                  <Pressable
                    onPress={() => setPage("limits")}
                    style={({ pressed }) => pressed && styles.pressed}
                    accessibilityRole="button"
                  >
                    <View style={styles.item}>
                      <View style={styles.hubMeter}>
                        <UsageBar pct={usagePct} color={meterColor} height={6} />
                        <Text style={[styles.miniPct, { color: pal.fg, fontSize: fs(11) }]}>
                          {usagePct}%
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.itemMain,
                          styles.itemBorder,
                          { borderBottomColor: pal.line, marginLeft: 12 },
                        ]}
                      >
                        <View style={styles.itemCopy}>
                          <Text style={[styles.itemTitle, { color: pal.fg, fontSize: fs(15) }]}>
                            {t(
                              snap?.period === "lifetime"
                                ? "chat.settings.limitTitleOnce"
                                : "chat.settings.limitTitle",
                            )}
                          </Text>
                          <Text style={[styles.itemSubtitle, { color: pal.muted, fontSize: fs(12) }]}>
                            {t("chat.settings.limitUsedPct", { pct: usagePct })}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={pal.muted} />
                      </View>
                    </View>
                  </Pressable>
                  <SettingsItem
                    icon="diamond"
                    title={t("chat.settings.upgradePlan")}
                    onPress={onOpenSubscription}
                    titleColor={ACCENT_BLUE}
                    iconColor={ACCENT_BLUE}
                    last
                  />
                </SettingsSection>

                <SettingsSection title={t("chat.settings.appSettingsGroup")}>
                  <SettingsItem
                    icon="contrast"
                    title={t("chat.settings.appearance")}
                    subtitle={
                      pal.theme === "dark"
                        ? t("chat.settings.themeDark")
                        : t("chat.settings.themeLight")
                    }
                    onPress={() => setPage("appearance")}
                  />
                  <SettingsItem
                    icon="notifications"
                    title={t("chat.settings.limitNotify")}
                    subtitle={
                      prefs.limitNotify
                        ? t("chat.settings.limitNotifyOn")
                        : t("chat.settings.limitNotifyOff")
                    }
                    onPress={() => setPage("limits")}
                  />
                  <SettingsItem
                    icon="mic"
                    title={t("chat.settings.voiceInput")}
                    subtitle={
                      prefs.voiceInput
                        ? t("chat.settings.voiceOn")
                        : t("chat.settings.voiceOff")
                    }
                    onPress={() => setPage("voice")}
                  />
                  <SettingsItem
                    icon="lock-closed"
                    title={t("chat.settings.privacyLocal")}
                    subtitle={
                      prefs.privacyLocalOnly
                        ? t("chat.settings.privacyOn")
                        : t("chat.settings.privacyOff")
                    }
                    onPress={() => setPage("data")}
                  />
                  <SettingsItem
                    icon="folder"
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
                    icon="flag"
                    title={t("chat.settings.reportProblem")}
                    onPress={() => setPage("report")}
                  />
                  <SettingsItem
                    icon="help-circle"
                    title={t("chat.settings.helpCenter")}
                    onPress={() => setPage("help")}
                    last
                  />
                </SettingsSection>

                <View style={[styles.card, { backgroundColor: pal.card }]}>
                  <Pressable
                    onPress={confirmClear}
                    style={({ pressed }) => [styles.destructiveRow, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <View style={[styles.iconTile, { backgroundColor: pal.iconTile }]}>
                      <Ionicons name="trash" size={18} color={DESTRUCTIVE} />
                    </View>
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

        {page === "account" ? <PersonalInfoPanel /> : null}

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
            {nearlyEmpty ? (
              <View style={styles.warnBanner}>
                <Ionicons name="warning-outline" size={18} color={WARN} />
                <Text style={styles.warnText}>
                  {t("chat.settings.limitWarn", { pct: usagePct })}
                </Text>
              </View>
            ) : null}
            <UsageMeter
              pct={usagePct}
              color={meterColor}
              caption={t("chat.settings.limitMeterCaption")}
              usedLabel={t("chat.settings.limitUsedPct", { pct: usagePct })}
              leftLabel={t("chat.settings.limitLeftPct", { pct: Math.max(0, 100 - usagePct) })}
            />
            <View style={{ height: 16 }} />
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
                    icon="diamond"
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
                    icon="chatbubbles"
                title={t("chat.settings.dataChats")}
                value={String(counts.chat_threads)}
                showChevron={false}
              />
              <SettingsItem
                icon="images"
                title={t("chat.settings.dataLooks")}
                value={String(counts.looks)}
                showChevron={false}
              />
              <SettingsItem
                icon="camera"
                title={t("chat.settings.dataSelfies")}
                value={String(counts.selfies)}
                showChevron={false}
              />
              <SettingsItem
                    icon="share-social"
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
                icon="download"
                title={t("chat.settings.exportChats")}
                subtitle={t("chat.settings.exportChatsHint", { count: threadCount })}
                onPress={() => void exportChats()}
              />
              <SettingsItem
                icon="trash"
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
                icon="trash"
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
                icon="trash"
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
      {confirm ? (
        <ConfirmSheet
          spec={confirm}
          busy={confirmBusy}
          onCancel={() => {
            if (!confirmBusy) setConfirm(null);
          }}
          onConfirm={runConfirm}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    position: "relative",
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
    ...morphFont,
    fontSize: 15,
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
    ...morphFont,
    fontSize: 26,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.4,
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
    ...morphFont,
    fontSize: 18,
    fontWeight: "600",
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
    ...morphFont,
    fontSize: 12,
    fontWeight: "400",
    color: MUTED,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  item: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingLeft: 14,
    minHeight: 58,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginRight: 14,
  },
  itemMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 14,
    gap: 10,
  },
  miniPct: {
    ...morphFont,
    fontWeight: "700",
    textAlign: "right",
  },
  hubMeter: {
    width: 52,
    gap: 4,
    alignSelf: "center",
    justifyContent: "center",
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  itemTitle: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  itemSubtitle: {
    marginTop: 2,
    ...morphFont,
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
  },
  itemValue: {
    ...morphFont,
    fontSize: 14,
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
    gap: 10,
    paddingLeft: 12,
    paddingRight: 16,
    paddingVertical: 12,
    minHeight: 52,
  },
  destructiveText: {
    ...morphFont,
    fontSize: 15,
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
    ...morphFont,
    fontSize: 12,
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
    ...morphFont,
    fontSize: 13,
    lineHeight: 18,
    color: WARN,
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 69, 58, 0.14)",
  },
  errorText: {
    flex: 1,
    ...morphFont,
    fontSize: 13,
    lineHeight: 18,
    color: DESTRUCTIVE,
  },
  meterBlock: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: "center",
    gap: 16,
  },
  meterRingWrap: {
    width: 156,
    height: 156,
    alignItems: "center",
    justifyContent: "center",
  },
  meterCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  meterPctBig: {
    ...morphFont,
    fontSize: 36,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  meterStats: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
  },
  meterStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meterStatLabel: {
    ...morphFont,
    fontSize: 11,
    color: MUTED,
  },
  meterStatValue: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  meterCap: {
    ...morphFont,
    fontSize: 12,
    color: MUTED,
  },
  confirmRoot: {
    ...StyleSheet.absoluteFill,
    zIndex: 40,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  confirmScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  confirmCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 16,
    gap: 10,
  },
  confirmTitle: {
    ...morphFont,
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  confirmBody: {
    ...morphFont,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: "center",
    marginBottom: 6,
  },
  confirmRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmNo: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmNoText: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  confirmYes: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: DESTRUCTIVE,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmYesText: {
    ...morphFont,
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  pageLead: {
    marginBottom: 16,
    marginHorizontal: 4,
    ...morphFont,
    fontSize: 13,
    lineHeight: 19,
    color: MUTED,
  },
  syncHint: {
    marginTop: -12,
    marginBottom: 16,
    marginHorizontal: 12,
    ...morphFont,
    fontSize: 11,
    color: MUTED,
  },
  pressed: {
    opacity: 0.72,
  },
});
