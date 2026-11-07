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
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatHairstyleCard, MorphChatMessage } from "../../api/ai";
import { resolveMediaUrl } from "../../api/media";
import { displayName, initials } from "../../api/user";
import { useAuth } from "../../auth/AuthContext";
import { MorphPaywallView } from "../../components/morph/MorphPaywallView";
import { ChatBubble } from "../../components/morph/chat/ChatBubble";
import { ChatHairAsk } from "../../components/morph/chat/ChatHairAsk";
import { ChatInputBar } from "../../components/morph/chat/ChatInputBar";
import { ChatMenuDrawer } from "../../components/morph/chat/ChatMenuDrawer";
import { ChatNotice } from "../../components/morph/chat/ChatNotice";
import { MorphChatWelcome } from "../../components/morph/chat/MorphChatWelcome";
import { QuickPromptChips } from "../../components/morph/chat/QuickPromptChips";
import { VoiceSessionOverlay } from "../../components/morph/chat/VoiceSessionOverlay";
import { SafeModal } from "../../components/ui/SafeModal";
import { safeBottom, safeTop } from "../../lib/safe-area";
import { useHideTabBarWhen } from "../../hooks/useHideTabBar";
import { useMorphChat } from "../../hooks/useMorphChat";
import { useMorphVoice } from "../../hooks/useMorphVoice";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { readLastMorphContentTab, writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import { MORPH_CHAT_DEBUG } from "../../lib/morph-debug";
import { morphChatLimitTitleKey, morphChatUsagePercent } from "../../lib/morph-chat-prefs";
import {
  consumeMorphReturn,
  peekMorphReturn,
  rememberMorphReturn,
  type PaywallReason,
} from "../../lib/morph-return";
import type { RootTabParamList } from "../../navigation/RootTabs";
import { MorphChatSettingsScreen } from "./MorphChatSettingsScreen";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { ChatAmbientBg } from "../../components/morph/chat/ChatAmbientBg";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { morphFont } from "../../theme/morph-font";
import {
  IS_SMALL_DEVICE,
  fontSize,
  moderateScale,
  scale,
  spacing,
} from "../../utils/responsive";

export function MorphChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { isAuthenticated, user } = useAuth();
  const gate = useMorphLimitGate();
  const listRef = useRef<FlatList<MorphChatMessage>>(null);
  const stickToBottom = useRef(true);
  const chat = useMorphChat();
  const { colors: pal } = useMorphAppearance();
  const pendingDraft = useRef<string | null>(null);
  const [hairDraft, setHairDraft] = useState<string | null>(null);
  const [hairSaving, setHairSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [paywallEpoch, setPaywallEpoch] = useState(0);

  const openHairstyle = useCallback(
    (item: ChatHairstyleCard) => {
      const imageUrl = resolveMediaUrl(item.image_url, { width: scale(900) }) || item.image_url;
      navigation.navigate(
        "MorphTryOn",
        {
          screen: "MorphPreview",
          params: {
            styleId: item.id,
            title: item.name,
            match: 0,
            imageUrl,
            reason: item.description || "",
            returnTo: "chat",
          },
        } as never,
      );
    },
    [navigation],
  );

  const openPaywall = useCallback((reason: PaywallReason) => {
    setPaywallEpoch((n) => n + 1);
    setPaywall(reason);
  }, []);

  const showPaywall = useCallback(
    (reason: PaywallReason, draft?: string) => {
      if (draft) pendingDraft.current = draft;
      rememberMorphReturn({
        returnTo: "MorphChat",
        reason,
        draft: draft || pendingDraft.current || undefined,
        chatOpen,
      });
      openPaywall(reason);
    },
    [chatOpen, openPaywall],
  );

  const closePaywall = useCallback(() => {
    consumeMorphReturn();
    setPaywall(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void chat.refreshHairProfile();
    }, [chat.refreshHairProfile]),
  );

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
          openPaywall(pending.reason ?? "subscription");
          return;
        }
        const result = MORPH_CHAT_DEBUG
          ? ({ ok: true } as const)
          : await gate.ensureChatDetailed();
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
          openPaywall(result.reason === "limit" ? "limit" : "subscription");
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
  const avatarUrl = resolveMediaUrl(user?.avatar, { width: scale(120) });

  const scrollToEnd = useCallback(() => {
    stickToBottom.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const onChatScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    stickToBottom.current = distance < 140;
  }, []);

  const onChatContentSize = useCallback(() => {
    if (!stickToBottom.current) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  const requireAccess = useCallback(
    async (draft?: string) => {
      if (!isAuthenticated) {
        showPaywall("subscription", draft);
        return false;
      }
      if (MORPH_CHAT_DEBUG) return true;

      const result = await gate.ensureChatDetailed();
      if (!result.ok) {
        showPaywall(result.reason === "limit" ? "limit" : "subscription", draft);
        return false;
      }
      void chat.refreshLimits();
      return true;
    },
    [chat.refreshLimits, gate.ensureChatDetailed, isAuthenticated, showPaywall],
  );

  const requireVoice = useCallback(async () => {
    if (!isAuthenticated) {
      showPaywall("subscription");
      return false;
    }
    if (MORPH_CHAT_DEBUG) return true;
    const result = await gate.ensureVoiceDetailed();
    if (result.ok) return true;
    showPaywall(result.reason === "limit" ? "limit" : "subscription");
    return false;
  }, [gate.ensureVoiceDetailed, isAuthenticated, showPaywall]);

  const voice = useMorphVoice({
    sendText: chat.sendText,
    lastReply: chat.lastReply,
    requireAccess,
    requireVoice,
    onLimit: (draft) => showPaywall("limit", draft),
    onOpenChat: () => {
      setChatOpen(true);
      scrollToEnd();
    },
  });

  const voiceOverlayOpen = voice.live || voice.phase !== "idle" || Boolean(voice.error);
  useHideTabBarWhen(true);

  const leaveChat = useCallback(() => {
    void readLastMorphContentTab().then((tab) => {
      const target = (tab === "MorphChat" ? "MorphTryOn" : tab) as keyof RootTabParamList;
      navigation.navigate(target);
    });
  }, [navigation]);

  /** Android tizim Back — UI orqaga bilan bir xil: Try-on / oldingi sahifa. */
  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
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
        leaveChat();
        return true;
      };

      const sub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
      return () => sub.remove();
    }, [
      closePaywall,
      leaveChat,
      menuOpen,
      paywall,
      settingsOpen,
      voice.cancelSession,
      voice.live,
      voice.phase,
    ]),
  );

  const tokenRemaining = Number(
    chat.limits?.token_remaining ?? chat.limits?.daily_remaining ?? NaN,
  );
  const chatLocked =
    !MORPH_CHAT_DEBUG && Number.isFinite(tokenRemaining) && tokenRemaining < 200;

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || MORPH_CHAT_DEBUG) return;
      let cancelled = false;
      void (async () => {
        const result = await gate.ensureChatDetailed();
        if (cancelled) return;
        if (result.ok) {
          await chat.refreshLimits();
          return;
        }
        openPaywall(result.reason === "limit" ? "limit" : "subscription");
      })();
      return () => {
        cancelled = true;
      };
      // gate obyekti har renderda yangilanmasin — aks holda API sikli.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]),
  );

  const composer = useMemo(
    () => ({
      value: chat.input,
      onChange: chat.setInput,
      disabled: chat.sending || voice.busy || chatLocked,
      sending: chat.sending,
      placeholder: chatLocked ? t("chat.tokenEmptyShort") : t("chat.home.askAnything"),
      sendA11y: t("chat.sendA11y"),
      cameraA11y: t("chat.home.cameraA11y"),
      voiceA11y: t("chat.settings.voiceInput"),
      voiceEnabled: false,
      voiceState: "idle" as const,
      onVoice: undefined,
    }),
    [chat.input, chat.sending, chat.setInput, chatLocked, t, voice],
  );

  const onSend = useCallback(async () => {
    const draft = chat.input.trim();
    if (!draft || chat.sending || hairSaving) return;
    const ok = await requireAccess(draft);
    if (!ok) return;
    if (!chat.hairComplete) {
      chat.setInput("");
      setHairDraft(draft);
      setChatOpen(true);
      return;
    }
    // Avval yuborish (optimistic), keyin chat UI — birinchi bosishda yo‘qolmasin
    const sentPromise = chat.sendText(draft);
    setChatOpen(true);
    requestAnimationFrame(() => scrollToEnd());
    const sent = await sentPromise;
    if (sent === "limit") {
      showPaywall("limit", draft);
      return;
    }
    scrollToEnd();
  }, [chat, hairSaving, requireAccess, scrollToEnd, showPaywall]);

  const finishHairAsk = useCallback(async () => {
    const draft = hairDraft;
    await chat.refreshHairProfile();
    setHairDraft(null);
    setHairSaving(false);
    if (!draft) return;
    setChatOpen(true);
    const sent = await chat.sendText(draft);
    if (sent === "limit") showPaywall("limit", draft);
    scrollToEnd();
  }, [chat, hairDraft, scrollToEnd, showPaywall]);

  const onPaywallSuccess = useCallback(async () => {
    consumeMorphReturn();
    setPaywall(null);
    gate.refresh();
    await chat.refreshLimits();
    const draft = pendingDraft.current || chat.input.trim();
    pendingDraft.current = null;
    setChatOpen(true);
    if (draft) {
      await chat.sendText(draft);
      scrollToEnd();
    }
  }, [chat, gate.refresh, scrollToEnd]);

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
    void chat.reloadPrefs();
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

  const usagePct = morphChatUsagePercent(chat.limits);

  const errorNotice = chat.error ? (
    <ChatNotice
      title={t("chat.errorTitle")}
      message={chat.error}
      retryLabel={t("chat.errorRetry")}
      dismissA11y={t("chat.errorDismissA11y")}
      onRetry={retryLast}
      onDismiss={chat.clearError}
    />
  ) : chatLocked ? (
    <ChatNotice
      title={t("chat.settings.limitTitleOnce")}
      message={t("chat.tokenEmpty")}
      retryLabel={t("chat.tokenEmptyCta")}
      dismissA11y={t("chat.errorDismissA11y")}
      tone="upgrade"
      onRetry={() => showPaywall("limit")}
      onDismiss={() => showPaywall("limit")}
    />
  ) : chat.limitWarning ? (
    <ChatNotice
      title={t(morphChatLimitTitleKey(chat.limits))}
      message={chat.limitWarning}
      dismissA11y={t("chat.errorDismissA11y")}
      tone="warning"
      meterPct={usagePct}
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
    <SafeModal visible={paywall != null} animationType="slide" onRequestClose={closePaywall}>
      {paywall != null ? (
        <MorphPaywallView
          key={`${paywall}-${paywallEpoch}`}
          reason={paywall}
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
      ) : null}
    </SafeModal>
  );

  const settingsModal = (
    <SafeModal visible={settingsOpen} animationType="slide" onRequestClose={closeSettings}>
      <MorphChatSettingsScreen
        limits={chat.limits}
        threadCount={chat.threads.length}
        threads={chat.threads}
        onClose={closeSettings}
        onClearAllChats={clearAllFromSettings}
        onOpenSubscription={openSubscriptionFromSettings}
        onSaveHistoryOff={() => void chat.clearAllChats()}
        onPreviewVoice={async (id) => {
          const ok = await requireVoice();
          if (!ok) return;
          void voice.previewVoice(id, t("chat.settings.voiceSample"));
        }}
        voicePreviewing={voice.previewing}
      />
    </SafeModal>
  );

  const voiceOverlay = (
    <SafeModal
      visible={voiceOverlayOpen}
      animationType="fade"
      onRequestClose={() => void voice.cancelSession()}
    >
      <VoiceSessionOverlay
        visible
        phase={voice.phase}
        metering={voice.metering}
        transcript={voice.transcript}
        reply={voice.reply}
        error={voice.error}
        title={t("chat.settings.voiceLiveTitle")}
        listeningLabel={t("chat.settings.voiceListening")}
        listeningHint={t("chat.settings.voiceListeningHint")}
        transcribingLabel={t("chat.settings.voiceTranscribing")}
        thinkingLabel={t("chat.typing")}
        speakingLabel={t("chat.settings.voiceSpeaking")}
        yourTurnLabel={t("chat.settings.voiceYourTurn")}
        tapToStop={t("chat.settings.voiceTapHint")}
        tapToSend={t("chat.settings.voiceTapSend")}
        interruptLabel={t("chat.settings.voiceInterrupt")}
        closeA11y={t("chat.errorDismissA11y")}
        onClose={() => void voice.cancelSession()}
        onPrimary={() => {
          if (voice.phase === "recording") void voice.stopListening();
          else if (voice.phase === "speaking") void voice.interruptSpeech();
          else if (voice.phase === "waiting") void voice.startListening();
          else void voice.cancelSession();
        }}
      />
    </SafeModal>
  );

  if (!chat.hydrated || !chat.hairReady) {
    return (
      <View style={[styles.root, styles.boot, { backgroundColor: pal.bg }]}>
        <StatusBar style={pal.status} />
        <ActivityIndicator color={pal.fg} />
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
          onExit={leaveChat}
          exitA11y={t("chat.home.backA11y")}
          bottomPad={safeBottom(insets.bottom, 18)}
          composer={
            <View>
              <ChatInputBar {...composer} onSend={() => void onSend()} onCamera={onCamera} />
              {chatLocked ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => showPaywall("limit")}
                  accessibilityRole="button"
                  accessibilityLabel={t("chat.tokenEmptyCta")}
                />
              ) : null}
            </View>
          }
          chips={
            <QuickPromptChips
              prompts={chat.quickPrompts}
              onSelect={async (p) => {
                const ok = await requireAccess();
                if (!ok) return;
                if (!chat.hairComplete) {
                  setHairDraft(p.label);
                  setChatOpen(true);
                  return;
                }
                setChatOpen(true);
                await chat.sendQuickPrompt(p.id as any);
                scrollToEnd();
              }}
              disabled={chat.sending || voice.busy || chatLocked}
            />
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
            ) : chatLocked ? (
              <ChatNotice
                title={t("chat.settings.limitTitleOnce")}
                message={t("chat.tokenEmpty")}
                retryLabel={t("chat.tokenEmptyCta")}
                dismissA11y={t("chat.errorDismissA11y")}
                tone="upgrade"
                onRetry={() => showPaywall("limit")}
                onDismiss={() => showPaywall("limit")}
                style={{ marginHorizontal: 0, marginBottom: 0 }}
              />
            ) : chat.limitWarning ? (
              <ChatNotice
                title={t("chat.settings.limitTitle")}
                message={chat.limitWarning}
                dismissA11y={t("chat.errorDismissA11y")}
                tone="warning"
                meterPct={usagePct}
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
    <View style={[styles.root, { paddingTop: safeTop(insets.top, 4) }]}>
      <ChatAmbientBg />
      <StatusBar style={pal.status} />
      <View style={[styles.header, { borderBottomColor: pal.line }]}>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.menu.openA11y")}
          hitSlop={8}
        >
          <Ionicons name="menu" size={ICON.lg} color={pal.fg} />
        </Pressable>
        <View style={styles.headerTitleCenter} pointerEvents="none">
          <Text
            style={[styles.title, { color: pal.fg }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {threadTitle}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
        <Pressable
          onPress={() => {
            chat.startNewChat();
            setChatOpen(false);
          }}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.menu.newChat")}
          hitSlop={8}
        >
          <Ionicons name="create-outline" size={ICON.md} color={pal.fg} />
        </Pressable>
        <NativeBackButton
          onPress={leaveChat}
          forward
          accessibilityLabel={t("chat.home.backA11y")}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + spacing.xs : 0}
      >
        <FlatList
          ref={listRef}
          data={chat.messages}
          extraData={`${chat.sending}-${chat.messages[chat.messages.length - 1]?.content ?? ""}-${chat.messages[chat.messages.length - 1]?.blocks?.length ?? 0}-${chat.messages[chat.messages.length - 1]?.hairstyles?.length ?? 0}`}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              pending={Boolean(item.streaming) && !item.content && !item.blocks?.length}
              streaming={Boolean(item.streaming) && Boolean(item.content || item.blocks?.length)}
              hairstyles={item.hairstyles}
              blocks={item.blocks}
              onOpenHairstyle={openHairstyle}
            />
          )}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            hairDraft ? (
              <ChatHairAsk
                draft={hairDraft}
                onSaved={() => {
                  setHairSaving(true);
                  return finishHairAsk();
                }}
              />
            ) : null
          }
          onScroll={onChatScroll}
          scrollEventThrottle={32}
          onContentSizeChange={onChatContentSize}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {errorNotice}

        <View
          style={[
            styles.composerDock,
            {
              paddingBottom: safeBottom(insets.bottom, 8),
            },
          ]}
        >
          <View>
            <ChatInputBar {...composer} onSend={() => void onSend()} onCamera={onCamera} />
            {chatLocked ? (
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => showPaywall("limit")}
                accessibilityRole="button"
                accessibilityLabel={t("chat.tokenEmptyCta")}
              />
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>

      {menuDrawer}
      {paywallModal}
      {settingsModal}
      {voiceOverlay}
    </View>
  );
}

const ICON = {
  md: scale(20),
  lg: scale(22),
} as const;

const HEADER_BTN = scale(40);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "transparent",
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
    paddingHorizontal: scale(12),
    paddingVertical: spacing.xs,
    gap: moderateScale(6),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    position: "relative",
  },
  headerBtn: {
    width: HEADER_BTN,
    height: HEADER_BTN,
    borderRadius: HEADER_BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pressed: {
    opacity: 0.72,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitleCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: HEADER_BTN * 2.5 + scale(16),
  },
  title: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "700",
    color: "#111111",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  composerDock: {
    paddingHorizontal: scale(16),
    paddingTop: spacing.xs,
    backgroundColor: "transparent",
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexGrow: 1,
    backgroundColor: "transparent",
  },
});
