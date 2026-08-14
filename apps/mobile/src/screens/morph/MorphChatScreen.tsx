import { Ionicons } from "@expo/vector-icons";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "../../auth/AuthContext";
import { ChatBubble } from "../../components/morph/chat/ChatBubble";
import { ChatHistorySheet } from "../../components/morph/chat/ChatHistorySheet";
import { ChatInputBar } from "../../components/morph/chat/ChatInputBar";
import { MorphChatWelcome } from "../../components/morph/chat/MorphChatWelcome";
import { QuickPromptChips } from "../../components/morph/chat/QuickPromptChips";
import { MORPH_QUICK_PROMPT_IDS, useMorphChat } from "../../hooks/useMorphChat";
import { useMorphLimitGate } from "../../hooks/useMorphLimitGate";

export function MorphChatScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const gate = useMorphLimitGate();
  const listRef = useRef<FlatList<MorphChatMessage>>(null);
  const chat = useMorphChat();
  const [historyOpen, setHistoryOpen] = useState(false);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const onSend = useCallback(async () => {
    if (!isAuthenticated) return;
    const ok = await gate.ensureAccess();
    if (!ok) return;
    await chat.sendText(chat.input);
    scrollToEnd();
  }, [chat, gate, isAuthenticated, scrollToEnd]);

  const onQuickPrompt = useCallback(
    async (id: string) => {
      if (!isAuthenticated) return;
      const ok = await gate.ensureAccess();
      if (!ok) return;
      chat.sendQuickPrompt(id as (typeof MORPH_QUICK_PROMPT_IDS)[number]);
      scrollToEnd();
    },
    [chat, gate, isAuthenticated, scrollToEnd],
  );

  const bottomPad = Math.max(insets.bottom, 8) + 72;

  if (!chat.hydrated || chat.welcomeSeen === null) {
    return (
      <View style={[styles.root, styles.boot]}>
        <ActivityIndicator color="rgba(255,255,255,0.5)" />
      </View>
    );
  }

  if (!chat.welcomeSeen) {
    return (
      <MorphChatWelcome
        headline={t("chat.marketing.headline")}
        ctaLabel={t("chat.marketing.cta")}
        onStart={() => void chat.markWelcomeSeen()}
      />
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubble-ellipses" size={18} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t("chat.title")}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {chat.hasContext ? t("chat.contextLinked") : t("chat.subtitle")}
          </Text>
        </View>
        <Pressable
          onPress={() => setHistoryOpen(true)}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t("chat.history.title")}
        >
          <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Pressable
          onPress={chat.startNewChat}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel={t("chat.history.newChat")}
        >
          <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.7)" />
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
          <Ionicons name="lock-closed-outline" size={28} color="rgba(255,255,255,0.4)" />
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

          <QuickPromptChips
            prompts={chat.quickPrompts}
            onSelect={(p) => void onQuickPrompt(p.id)}
            disabled={chat.sending}
          />

          <View style={{ paddingBottom: bottomPad }}>
            <ChatInputBar
              value={chat.input}
              onChange={chat.setInput}
              onSend={() => void onSend()}
              disabled={!isAuthenticated}
              sending={chat.sending}
              placeholder={t("chat.inputPlaceholder")}
              sendA11y={t("chat.sendA11y")}
            />
          </View>
        </KeyboardAvoidingView>
      )}

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
        }}
        onDelete={chat.deleteThread}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050505",
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(139, 92, 246, 0.28)",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  limitBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  limitText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
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
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  errorText: {
    fontSize: 13,
    color: "#FCA5A5",
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
    color: "#FFFFFF",
  },
  guestSub: {
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
});
