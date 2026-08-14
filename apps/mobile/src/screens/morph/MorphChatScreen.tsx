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
import { ChatAmbientBg } from "../../components/morph/chat/ChatAmbientBg";
import { ChatBubble } from "../../components/morph/chat/ChatBubble";
import { ChatInputBar } from "../../components/morph/chat/ChatInputBar";
import { ChatMenuDrawer } from "../../components/morph/chat/ChatMenuDrawer";
import { MorphChatWelcome } from "../../components/morph/chat/MorphChatWelcome";
import { QuickPromptChips } from "../../components/morph/chat/QuickPromptChips";
import { TAB_DOCK_CLEARANCE, useHideTabBarWhen } from "../../hooks/useHideTabBar";
import { MORPH_QUICK_PROMPT_IDS, useMorphChat } from "../../hooks/useMorphChat";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
import { writeAppShell, writeLastShellTab } from "../../lib/app-shell";
import { MORPH_CHAT_DEBUG } from "../../lib/morph-debug";
import {
  consumeMorphReturn,
  peekMorphReturn,
  rememberMorphReturn,
  type PaywallReason,
} from "../../lib/morph-return";
import type { RootTabParamList } from "../../navigation/RootTabs";

function greetingKey(hour: number): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  if (hour < 12) return "greetingMorning";
  if (hour < 18) return "greetingAfternoon";
  return "greetingEvening";
}

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
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);

  useHideTabBarWhen(chatOpen || paywall != null);

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
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (paywall) {
          closePaywall();
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
    }, [chatOpen, closePaywall, menuOpen, paywall]),
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
  const greeting = t(`chat.home.${greetingKey(new Date().getHours())}`);

  const composer = useMemo(
    () => ({
      value: chat.input,
      onChange: chat.setInput,
      disabled: chat.sending,
      sending: chat.sending,
      placeholder: t("chat.home.askAnything"),
      sendA11y: t("chat.sendA11y"),
      cameraA11y: t("chat.home.cameraA11y"),
    }),
    [chat.input, chat.sending, chat.setInput, t],
  );

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

  const onCamera = useCallback(() => {
    navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
  }, [navigation]);

  const openLooks = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate("MorphTryOn", { screen: "MorphHistory" } as never);
  }, [navigation]);

  const openNewLook = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
  }, [navigation]);

  const openLook = useCallback(
    (id: number) => {
      setMenuOpen(false);
      navigation.navigate("MorphTryOn", {
        screen: "MorphHistory",
        params: { generationId: id },
      } as never);
    },
    [navigation],
  );

  const openProfile = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate("Profile");
  }, [navigation]);

  const openSettings = useCallback(() => {
    setMenuOpen(false);
    navigation.navigate("Profile", { screen: "Settings" } as never);
  }, [navigation]);

  const menuDrawer = (
    <ChatMenuDrawer
      visible={menuOpen}
      brand={t("chat.menu.brand")}
      newChatLabel={t("chat.menu.newChat")}
      searchLabel={t("chat.menu.search")}
      searchPlaceholder={t("chat.menu.searchPlaceholder")}
      libraryLabel={t("chat.menu.library")}
      looksLabel={t("chat.menu.looks")}
      newLookLabel={t("chat.menu.newLook")}
      allLooksLabel={t("chat.menu.allLooks")}
      recentLabel={t("chat.menu.recent")}
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
      onNewLook={openNewLook}
      onAllLooks={openLooks}
      onLook={openLook}
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
      />
    </Modal>
  );

  if (!chat.hydrated) {
    return (
      <View style={[styles.root, styles.boot]}>
        <ChatAmbientBg />
        <StatusBar style="dark" />
        <ActivityIndicator color="#7C3AED" />
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
          greeting={greeting}
          name={name}
          avatarUrl={avatarUrl}
          initials={initials(name)}
          brandLabel={t("chat.menu.brand")}
          menuA11y={t("chat.menu.openA11y")}
          onMenu={() => setMenuOpen(true)}
          historyA11y={t("chat.history.title")}
          onHistory={() => setMenuOpen(true)}
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
        />
        {menuDrawer}
        {paywallModal}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ChatAmbientBg />
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => setChatOpen(false)}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={22} color="#1E1B4B" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("chat.title")}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {chat.hasContext ? t("chat.contextLinked") : t("chat.subtitle")}
          </Text>
        </View>
        <Pressable
          onPress={() => setMenuOpen(true)}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.history.title")}
        >
          <Ionicons name="time-outline" size={18} color="#1E1B4B" />
        </Pressable>
        <Pressable
          onPress={chat.startNewChat}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.history.newChat")}
        >
          <Ionicons name="create-outline" size={18} color="#1E1B4B" />
        </Pressable>
      </View>

      {chat.limits ? (
        <View style={styles.limitBar}>
          <Text style={styles.limitText}>
            {t("chat.dailyLimit", {
              used: chat.limits.daily_used ?? "—",
              limit: chat.limits.daily_limit,
            })}
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={chat.messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatBubble role={item.role} content={item.content} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 12 }]}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            chat.sending ? (
              <ChatBubble role="assistant" content={t("chat.typing")} pending />
            ) : null
          }
        />

        {chat.error ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{chat.error}</Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) }}>
          <ChatInputBar {...composer} onSend={() => void onSend()} onCamera={onCamera} />
        </View>
      </KeyboardAvoidingView>

      {menuDrawer}
      {paywallModal}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7F3FF",
  },
  boot: {
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
    zIndex: 1,
  },
  header: {
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.08)",
  },
  pressed: {
    opacity: 0.78,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E1B4B",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B6685",
  },
  limitBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  limitText: {
    fontSize: 11,
    color: "#6B6685",
  },
  list: {
    paddingTop: 12,
    flexGrow: 1,
  },
  errorBar: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#FEE2E2",
  },
  errorText: {
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
  },
  guest: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },
  guestSub: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8A8A8E",
    textAlign: "center",
  },
});
