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
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MorphChatMessage } from "../../api/ai";
import { resolveMediaUrl } from "../../api/media";
import { displayName, initials } from "../../api/user";
import { useAuth } from "../../auth/AuthContext";
import { ChatBubble } from "../../components/morph/chat/ChatBubble";
import { ChatHistorySheet } from "../../components/morph/chat/ChatHistorySheet";
import { ChatInputBar } from "../../components/morph/chat/ChatInputBar";
import { MorphChatWelcome } from "../../components/morph/chat/MorphChatWelcome";
import { QuickPromptChips } from "../../components/morph/chat/QuickPromptChips";
import { TAB_DOCK_CLEARANCE, useHideTabBarWhen } from "../../hooks/useHideTabBar";
import { MORPH_QUICK_PROMPT_IDS, useMorphChat } from "../../hooks/useMorphChat";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useHideTabBarWhen(chatOpen);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (chatOpen) {
          setChatOpen(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, [chatOpen]),
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

  const openChat = useCallback(() => setChatOpen(true), []);

  const onSend = useCallback(async () => {
    if (!chat.input.trim()) return;
    openChat();
    if (!isAuthenticated) return;
    const ok = await gate.ensureAccess();
    if (!ok) return;
    await chat.sendText(chat.input);
    scrollToEnd();
  }, [chat, gate, isAuthenticated, openChat, scrollToEnd]);

  const onQuickPrompt = useCallback(
    async (id: string) => {
      openChat();
      if (!isAuthenticated) return;
      const ok = await gate.ensureAccess();
      if (!ok) return;
      chat.sendQuickPrompt(id as (typeof MORPH_QUICK_PROMPT_IDS)[number]);
      scrollToEnd();
    },
    [chat, gate, isAuthenticated, openChat, scrollToEnd],
  );

  const onCamera = useCallback(() => {
    navigation.navigate("MorphTryOn", { screen: "MorphCapture" } as never);
  }, [navigation]);

  const historySheet = (
    <ChatHistorySheet
      visible={historyOpen}
      threads={chat.threads}
      activeThreadId={chat.activeThreadId}
      title={t("chat.history.title")}
      emptyLabel={t("chat.history.empty")}
      newChatLabel={t("chat.history.newChat")}
      onClose={() => setHistoryOpen(false)}
      onNewChat={() => {
        chat.startNewChat();
        setHistoryOpen(false);
      }}
      onSelect={(id) => {
        chat.openThread(id);
        setHistoryOpen(false);
        setChatOpen(true);
      }}
      onDelete={chat.deleteThread}
    />
  );

  if (!chat.hydrated) {
    return (
      <View style={[styles.root, styles.boot]}>
        <StatusBar style="dark" />
        <ActivityIndicator color="#7B4DFF" />
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
          headline={t("chat.home.headline")}
          subtitle={t("chat.home.subtitle")}
          historyA11y={t("chat.history.title")}
          onHistory={() => setHistoryOpen(true)}
          bottomPad={Math.max(insets.bottom, 8) + TAB_DOCK_CLEARANCE}
        >
          <ChatInputBar {...composer} onSend={() => void onSend()} onCamera={onCamera} />
          <QuickPromptChips
            prompts={chat.quickPrompts}
            onSelect={(p) => void onQuickPrompt(p.id)}
            disabled={chat.sending}
          />
        </MorphChatWelcome>
        {historySheet}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          onPress={() => setChatOpen(false)}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
        >
          <Ionicons name="chevron-back" size={22} color="#111111" />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("chat.title")}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {chat.hasContext ? t("chat.contextLinked") : t("chat.subtitle")}
          </Text>
        </View>
        <Pressable
          onPress={() => setHistoryOpen(true)}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.history.title")}
        >
          <Ionicons name="time-outline" size={18} color="#111111" />
        </Pressable>
        <Pressable
          onPress={chat.startNewChat}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("chat.history.newChat")}
        >
          <Ionicons name="create-outline" size={18} color="#111111" />
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

      {!isAuthenticated ? (
        <View style={styles.guest}>
          <Ionicons name="lock-closed-outline" size={28} color="#A1A1AA" />
          <Text style={styles.guestTitle}>{t("common.loginRequired")}</Text>
          <Text style={styles.guestSub}>{t("chat.loginRequired")}</Text>
        </View>
      ) : (
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
      )}

      {historySheet}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F4F2",
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
    backgroundColor: "#FFFFFF",
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
    color: "#111111",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#8A8A8E",
  },
  limitBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  limitText: {
    fontSize: 11,
    color: "#8A8A8E",
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
