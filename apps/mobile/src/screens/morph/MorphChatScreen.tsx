import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MorphChatMessage } from "../../api/ai";
import { resolveMediaUrl } from "../../api/media";
import { displayName, initials } from "../../api/user";
import { useAuth } from "../../auth/AuthContext";
import { MorphPaywallView } from "../../components/morph/MorphPaywallView";
import { ChatBubble } from "../../components/morph/chat/ChatBubble";
import { ChatInputBar } from "../../components/morph/chat/ChatInputBar";
import { ChatMenuDrawer } from "../../components/morph/chat/ChatMenuDrawer";
import { ChatNotice } from "../../components/morph/chat/ChatNotice";
import { MorphChatWelcome } from "../../components/morph/chat/MorphChatWelcome";
import { QuickPromptChips } from "../../components/morph/chat/QuickPromptChips";
import { VoiceSessionOverlay } from "../../components/morph/chat/VoiceSessionOverlay";
import { TAB_DOCK_CLEARANCE, useHideTabBarWhen } from "../../hooks/useHideTabBar";
import { MORPH_QUICK_PROMPT_IDS, useMorphChat } from "../../hooks/useMorphChat";
import { useMorphVoice } from "../../hooks/useMorphVoice";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import { MORPH_CHAT_DEBUG } from "../../lib/morph-debug";
import { readMorphChatPrefs } from "../../lib/morph-chat-prefs";
import {
  consumeMorphReturn,
  peekMorphReturn,
  rememberMorphReturn,
  type PaywallReason,
} from "../../lib/morph-return";
import type { RootTabParamList } from "../../navigation/RootTabs";
import { MorphChatSettingsScreen } from "./MorphChatSettingsScreen";

export function MorphChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { isAuthenticated, user } = useAuth();
  const gate = useMorphLimitGate();
  const listRef = useRef<FlatList<MorphChatMessage>>(null);
  const chat = useMorphChat();
  const pendingDraft = useRef<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readMorphChatPrefs().then((p) => {
        if (!cancelled) setVoiceEnabled(p.voiceInput);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const showPaywall = useCallback(
    (reason: PaywallReason, draft?: string) => {
      if (draft) pendingDraft.current = draft;
      rememberMorphReturn({
        returnTo: "MorphChat",
        reason,
        draft: draft || pendingDraft.current || undefined,
        chatOpen,
      });
      setPaywall(reason);
    },
    [chatOpen],
  );

  const closePaywall = useCallback(() => {
    consumeMorphReturn();
    setPaywall(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const pending = peekMorphReturn();
      if (pending?.returnTo !== "MorphChat") return undefined;

      if (pending.draft) {
        pendingDraft.current = pending.draft;
        chat.setInput(pending.draft);
      }

      let cancelled = false;
      void (async () => {
        if (!isAuthenticated) {
          setPaywall(pending.reason ?? "subscription");
          return;
        }
        const result = MORPH_CHAT_DEBUG
          ? ({ ok: true } as const)
          : await gate.ensureAccessDetailed();
        if (cancelled) return;
        if (result.ok) {
          const draft = pending.draft;
          consumeMorphReturn();
          setPaywall(null);
          if (pending.chatOpen || draft) setChatOpen(true);
          if (draft) {
            await chat.sendText(draft);
          }
        } else {
          setPaywall(result.reason === "limit" ? "limit" : "subscription");
        }
      })();

      return () => {
        cancelled = true;
      };
      // Faqat auth o‘zgarganda / fokusda bir marta — chat obyekti deps emas.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]),
  );

  const name = displayName(user);
  const avatarUrl = resolveMediaUrl(user?.avatar, { width: 120 });

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const requireAccess = useCallback(
    async (draft?: string) => {
      if (!isAuthenticated) {
        showPaywall("subscription", draft);
        return false;
      }
      // TEMP: Plus chatbot test — debug o‘chiq. Test tugagach MORPH_CHAT_DEBUG=false.
      if (MORPH_CHAT_DEBUG) return true;
      const result = await gate.ensureAccessDetailed();
      if (result.ok) return true;
      showPaywall(result.reason === "limit" ? "limit" : "subscription", draft);
      return false;
    },
    [gate, isAuthenticated, showPaywall],
  );

  const voice = useMorphVoice({
    sendText: chat.sendText,
    lastReply: chat.lastReply,
    requireAccess,
    onLimit: (draft) => showPaywall("limit", draft),
    onOpenChat: () => {
      setChatOpen(true);
      scrollToEnd();
    },
  });

  const voiceOverlayOpen = voice.live || voice.phase !== "idle" || Boolean(voice.error);
  useHideTabBarWhen(chatOpen || paywall != null || settingsOpen || voiceOverlayOpen);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (paywall) {
          closePaywall();
          return true;
        }
        if (voice.phase !== "idle" || voice.live) {
          void voice.cancelSession();
          return true;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return true;
        }
        if (menuOpen) {
          setMenuOpen(false);
          return true;
        }
        if (chatOpen) {
          setChatOpen(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [chatOpen, closePaywall, menuOpen, paywall, settingsOpen, voice.cancelSession, voice.live, voice.phase]),
  );

  const composer = useMemo(
    () => ({
      value: chat.input,
      onChange: chat.setInput,
      disabled: chat.sending || voice.busy,
      sending: chat.sending,
      placeholder: t("chat.home.askAnything"),
      sendA11y: t("chat.sendA11y"),
      cameraA11y: t("chat.home.cameraA11y"),
      voiceA11y: t("chat.settings.voiceInput"),
      voiceEnabled,
      voiceState: (voice.recording ? "recording" : voice.busy ? "busy" : "idle") as
        | "idle"
        | "recording"
        | "busy",
      onVoice: () => void voice.toggleMic(),
    }),
    [chat.input, chat.sending, chat.setInput, t, voice, voiceEnabled],
  );

  const onSend = useCallback(async () => {
    const draft = chat.input.trim();
    if (!draft) return;
    const ok = await requireAccess(draft);
    if (!ok) return;
    setChatOpen(true);
    const sent = await chat.sendText(draft);
    if (sent === "limit") {
      showPaywall("limit", draft);
      return;
    }
    scrollToEnd();
  }, [chat, requireAccess, scrollToEnd, showPaywall]);

  const onQuickPrompt = useCallback(
    async (id: string) => {
      const ok = await requireAccess(chat.input.trim() || undefined);
      if (!ok) return;
      setChatOpen(true);
      const sent = await chat.sendQuickPrompt(id as (typeof MORPH_QUICK_PROMPT_IDS)[number]);
      if (sent === "limit") {
        showPaywall("limit");
        return;
      }
      scrollToEnd();
    },
    [chat, requireAccess, scrollToEnd, showPaywall],
  );

  const onPaywallSuccess = useCallback(async () => {
    consumeMorphReturn();
    setPaywall(null);
    gate.refresh();
    const draft = pendingDraft.current || chat.input.trim();
    pendingDraft.current = null;
    setChatOpen(true);
    if (draft) {
      await chat.sendText(draft);
      scrollToEnd();
    }
  }, [chat, gate, scrollToEnd]);

  const onNeedLogin = useCallback(() => {
    rememberMorphReturn({
      returnTo: "MorphChat",
      reason: paywall ?? "subscription",
      draft: pendingDraft.current || chat.input.trim() || undefined,
      chatOpen,
    });
    void writeAppShell("morph");
    void writeLastShellTab("morph", "MorphChat");
    navigation.navigate("Profile");
  }, [chat.input, chatOpen, navigation, paywall]);

  const retryLast = useCallback(() => {
    void chat.retryLast();
  }, [chat]);

  const onCamera = useCallback(() => {
    navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
  }, [navigation]);

  const openLooks = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate("MorphTryOn", { screen: "MorphHistory" } as never);
  }, [navigation]);

  const openProfile = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate("Profile");
  }, [navigation]);

  const openSettings = useCallback(() => {
    setMenuOpen(false);
    setSettingsOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    void (async () => {
      await chat.reloadPrefs();
      const p = await readMorphChatPrefs();
      setVoiceEnabled(p.voiceInput);
    })();
    setSettingsOpen(false);
  }, [chat]);

  const clearAllFromSettings = useCallback(async () => {
    await chat.clearAllChats();
    setChatOpen(false);
    setSettingsOpen(false);
  }, [chat]);

  const openSubscriptionFromSettings = useCallback(() => {
    setSettingsOpen(false);
    showPaywall("subscription");
  }, [showPaywall]);

  const openReferralFromSettings = useCallback(() => {
    setSettingsOpen(false);
    setPaywall(null);
    navigation.navigate({
      name: "Profile",
      params: { screen: "Referrals" },
    } as never);
  }, [navigation]);

  const errorNotice = chat.error ? (
    <ChatNotice
      title={t("chat.errorTitle")}
      message={chat.error}
      retryLabel={t("chat.errorRetry")}
      dismissA11y={t("chat.errorDismissA11y")}
      onRetry={retryLast}
      onDismiss={chat.clearError}
    />
  ) : chat.limitWarning ? (
    <ChatNotice
      title={t("chat.settings.limitTitle")}
      message={chat.limitWarning}
      dismissA11y={t("chat.errorDismissA11y")}
      tone="warning"
      onDismiss={chat.clearLimitWarning}
    />
  ) : null;

  const menuDrawer = (
    <ChatMenuDrawer
      visible={menuOpen}
      brand={t("chat.menu.brand")}
      newChatLabel={t("chat.menu.newChat")}
      searchLabel={t("chat.menu.search")}
      searchPlaceholder={t("chat.menu.searchPlaceholder")}
      libraryLabel={t("chat.menu.library")}
      historyLabel={t("chat.menu.history")}
      emptyLabel={t("chat.history.empty")}
      settingsA11y={t("chat.menu.settingsA11y")}
      profileName={name}
      avatarUrl={avatarUrl}
      initials={initials(name)}
      threads={chat.threads}
      activeThreadId={chat.activeThreadId}
      onClose={() => setMenuOpen(false)}
      onNewChat={() => {
        chat.startNewChat();
        setMenuOpen(false);
        setChatOpen(false);
      }}
      onSelectThread={(id) => {
        chat.openThread(id);
        setMenuOpen(false);
        setChatOpen(true);
      }}
      onLibrary={openLooks}
      onProfile={openProfile}
      onSettings={openSettings}
    />
  );

  const paywallModal = (
    <Modal visible={paywall != null} animationType="slide" onRequestClose={closePaywall}>
      <MorphPaywallView
        reason={paywall ?? "subscription"}
        onClose={closePaywall}
        onSuccess={() => void onPaywallSuccess()}
        onNeedLogin={onNeedLogin}
        onOpenReferral={() => {
          closePaywall();
          navigation.navigate({
            name: "Profile",
            params: { screen: "Referrals" },
          } as never);
        }}
      />
    </Modal>
  );

  const settingsModal = (
    <Modal visible={settingsOpen} animationType="slide" onRequestClose={closeSettings}>
      <MorphChatSettingsScreen
        limits={chat.limits}
        threadCount={chat.threads.length}
        threads={chat.threads}
        onClose={closeSettings}
        onClearAllChats={() => void clearAllFromSettings()}
        onOpenSubscription={openSubscriptionFromSettings}
        onOpenReferral={openReferralFromSettings}
        onSaveHistoryOff={() => void chat.clearAllChats()}
        onPreviewVoice={(id) => void voice.previewVoice(id, t("chat.settings.voiceSample"))}
        voicePreviewing={voice.previewing}
      />
    </Modal>
  );

  const voiceOverlay = (
    <Modal
      visible={voiceOverlayOpen}
      animationType="fade"
      onRequestClose={() => void voice.cancelSession()}
    >
      <VoiceSessionOverlay
        visible
        phase={voice.phase}
        metering={voice.metering}
        transcript={voice.transcript}
        error={voice.error}
        title={t("chat.settings.voiceLiveTitle")}
        listeningLabel={t("chat.settings.voiceListening")}
        transcribingLabel={t("chat.settings.voiceTranscribing")}
        thinkingLabel={t("chat.typing")}
        speakingLabel={t("chat.settings.voiceSpeaking")}
        tapToStop={t("chat.settings.voiceTapHint")}
        closeA11y={t("chat.errorDismissA11y")}
        onClose={() => void voice.cancelSession()}
        onPrimary={() => {
          if (voice.phase === "recording") void voice.stopListening();
          else if (voice.phase === "speaking") void voice.interruptSpeech();
          else void voice.cancelSession();
        }}
      />
    </Modal>
  );

  if (!chat.hydrated) {
    return (
      <View style={[styles.root, styles.boot]}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#111111" />
      </View>
    );
  }

  if (!chatOpen) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <MorphChatWelcome
          headline={t("chat.home.headline")}
          subtitle={t("chat.home.subtitle")}
          menuA11y={t("chat.menu.openA11y")}
          onMenu={() => setMenuOpen(true)}
          bottomPad={Math.max(insets.bottom, 8) + TAB_DOCK_CLEARANCE}
          composer={<ChatInputBar {...composer} onSend={() => void onSend()} onCamera={onCamera} />}
          chips={
            chat.input.trim().length === 0 ? (
              <QuickPromptChips
                prompts={chat.quickPrompts}
                onSelect={(p) => void onQuickPrompt(p.id)}
                disabled={chat.sending}
              />
            ) : null
          }
          notice={
            chat.error ? (
              <ChatNotice
                title={t("chat.errorTitle")}
                message={chat.error}
                retryLabel={t("chat.errorRetry")}
                dismissA11y={t("chat.errorDismissA11y")}
                onRetry={retryLast}
                onDismiss={chat.clearError}
                style={{ marginHorizontal: 0, marginBottom: 0 }}
              />
            ) : chat.limitWarning ? (
              <ChatNotice
                title={t("chat.settings.limitTitle")}
                message={chat.limitWarning}
                dismissA11y={t("chat.errorDismissA11y")}
                tone="warning"
                onDismiss={chat.clearLimitWarning}
                style={{ marginHorizontal: 0, marginBottom: 0 }}
              />
            ) : null
          }
        />
        {menuDrawer}
        {paywallModal}
        {settingsModal}
        {voiceOverlay}
      </KeyboardAvoidingView>
    );
  }

  const threadTitle =
    chat.threads.find((th) => th.id === chat.activeThreadId)?.title || t("chat.title");

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.menu.openA11y")}
        >
          <Ionicons name="menu" size={22} color="#111111" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {threadTitle}
          </Text>
        </View>
        <Pressable
          onPress={() => setChatOpen(false)}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.home.backA11y")}
        >
          <Ionicons name="home-outline" size={20} color="#111111" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={chat.messages}
          extraData={`${chat.sending}-${chat.messages[chat.messages.length - 1]?.content ?? ""}`}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              pending={Boolean(item.streaming) && !item.content}
              streaming={Boolean(item.streaming) && Boolean(item.content)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 12 }]}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {errorNotice}

        <View style={[styles.composerDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ChatInputBar {...composer} onSend={() => void onSend()} onCamera={onCamera} />
        </View>
      </KeyboardAvoidingView>

      {menuDrawer}
      {paywallModal}
      {settingsModal}
      {voiceOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  boot: {
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E4E4E7",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.78,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  composerDock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
  },
  list: {
    paddingTop: 16,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
  },
});
