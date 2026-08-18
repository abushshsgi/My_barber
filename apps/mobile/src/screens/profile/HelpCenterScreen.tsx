import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { NativeHeader } from "../../components/ui/NativeHeader";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { useShellTheme } from "../../lib/useShellTheme";
import { colors } from "../../theme/colors";
import {
  submitSupportReply,
  submitSupportTicket,
  useSupportTicket,
  useSupportTickets,
} from "../support/useSupportTickets";

type Props = NativeStackScreenProps<ProfileStackParamList, "HelpCenter">;

type ViewState = "hub" | "ticket";

const TOPICS = [
  { id: "general", labelKey: "help.topicGeneral", subjectKey: "help.subjectGeneral", category: "user_support:general" },
  { id: "morph", labelKey: "help.topicMorph", subjectKey: "help.subjectMorph", category: "morph_ai:help" },
  { id: "problem", labelKey: "help.topicProblem", subjectKey: "help.subjectProblem", category: "morph_ai:problem" },
  { id: "payment", labelKey: "help.topicPayment", subjectKey: "help.subjectPayment", category: "user_support:payment" },
  { id: "booking", labelKey: "help.topicBooking", subjectKey: "help.subjectBooking", category: "user_support:booking" },
] as const;

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function statusLabel(status: string, t: (k: string) => string) {
  if (status === "open") return t("help.statusOpen");
  if (status === "pending") return t("help.statusPending");
  if (status === "resolved") return t("help.statusResolved");
  if (status === "closed") return t("help.statusClosed");
  return status;
}

export function HelpCenterScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const pal = useShellTheme();
  const { tickets, loading, refresh } = useSupportTickets();
  const [view, setView] = useState<ViewState>("hub");
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["id"]>("general");
  const [subject, setSubject] = useState(t("help.subjectGeneral"));
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faq = [
    { q: t("help.faq.bookQ"), a: t("help.faq.bookA") },
    { q: t("help.faq.payQ"), a: t("help.faq.payA") },
    { q: t("help.faq.morphQ"), a: t("help.faq.morphA") },
    { q: t("help.faq.waitQ"), a: t("help.faq.waitA") },
  ];

  const send = useCallback(async () => {
    const selected = TOPICS.find((x) => x.id === topic) ?? TOPICS[0];
    if (body.trim().length < 5) {
      setError(t("help.bodyMin"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ticket = await submitSupportTicket({
        subject: (subject.trim() || t(selected.subjectKey)).slice(0, 255),
        body: body.trim(),
        category: selected.category,
        relatedType: selected.category.startsWith("morph_ai") ? "morph_ai" : undefined,
      });
      setBody("");
      await refresh();
      setTicketId(ticket.id);
      setView("ticket");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("help.sendFail"));
    } finally {
      setBusy(false);
    }
  }, [body, refresh, subject, t, topic]);

  if (view === "ticket" && ticketId) {
    return (
      <TicketThread
        ticketId={ticketId}
        onBack={() => {
          setView("hub");
          void refresh();
        }}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <NativeHeader title={t("profile.helpCenter")} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lead}>{t("help.lead")}</Text>

          <Text style={styles.group}>{t("help.faqTitle")}</Text>
          <View style={styles.card}>
            {faq.map((item, i) => {
              const open = openFaq === i;
              return (
                <Pressable
                  key={item.q}
                  onPress={() => setOpenFaq(open ? null : i)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <View style={[styles.row, i < faq.length - 1 && styles.border]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.q}>{item.q}</Text>
                      {open ? <Text style={styles.a}>{item.a}</Text> : null}
                    </View>
                    <Ionicons
                      name={open ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.muted}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.group}>{t("help.writeTitle")}</Text>
          <View style={styles.card}>
            <View style={styles.chips}>
              {TOPICS.map((item) => {
                const active = topic === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setTopic(item.id);
                      setSubject(t(item.subjectKey));
                    }}
                    style={[styles.chip, active && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextOn]}>
                      {t(item.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder={t("help.subjectPh")}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t("help.bodyPh")}
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              onPress={() => void send()}
              disabled={busy}
              style={({ pressed }) => [styles.submit, pressed && styles.pressed, busy && { opacity: 0.5 }]}
            >
              {busy ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitText}>{t("help.send")}</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.group}>{t("help.myTickets")}</Text>
          {loading ? (
            <ActivityIndicator color={colors.fg} style={{ marginVertical: 16 }} />
          ) : tickets.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.empty}>{t("help.empty")}</Text>
            </View>
          ) : (
            <View style={styles.card}>
              {tickets.map((ticket, i) => (
                <Pressable
                  key={ticket.id}
                  onPress={() => {
                    setTicketId(ticket.id);
                    setView("ticket");
                  }}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <View style={[styles.row, i < tickets.length - 1 && styles.border]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.q}>{ticket.subject}</Text>
                      <Text style={styles.a} numberOfLines={2}>
                        {ticket.last_message || ticket.body}
                      </Text>
                      <Text style={styles.meta}>
                        #{ticket.id} · {statusLabel(ticket.status, t)} · {formatWhen(ticket.updated_at)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TicketThread({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { t } = useTranslation();
  const { ticket, loading, refresh } = useSupportTicket(ticketId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const replies = ticket?.replies ?? [];

  useEffect(() => {
    const tmr = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(tmr);
  }, [replies.length]);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await submitSupportReply(ticketId, text);
      setText("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const canReply = ticket?.can_reply !== false && ticket?.status !== "closed";

  const pal = useShellTheme();
  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <NativeHeader title={ticket?.subject || t("help.ticketTitle")} onBack={onBack} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {loading && !ticket ? (
          <ActivityIndicator color={colors.fg} style={{ marginTop: 32 }} />
        ) : (
          <>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={styles.thread}
              keyboardShouldPersistTaps="handled"
            >
              {replies.map((r) => {
                const mine = r.author_role === "user";
                return (
                  <View key={`${r.id}-${r.created_at}`} style={[styles.bubbleWrap, mine && { alignItems: "flex-end" }]}>
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleAdmin]}>
                      <Text style={[styles.bubbleMeta, mine && { color: "rgba(255,255,255,0.7)" }]}>
                        {mine ? t("help.you") : r.author_name || "Support"} · {formatWhen(r.created_at)}
                      </Text>
                      <Text style={[styles.bubbleBody, mine && { color: "#FFF" }]}>{r.body}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            {canReply ? (
              <View style={styles.composer}>
                <TextInput
                  value={text}
                  onChangeText={setText}
                  placeholder={t("help.replyPh")}
                  placeholderTextColor={colors.muted}
                  style={styles.composerInput}
                  multiline
                />
                <Pressable
                  onPress={() => void send()}
                  disabled={busy || !text.trim()}
                  style={[styles.sendBtn, (!text.trim() || busy) && { opacity: 0.4 }]}
                >
                  <Ionicons name="send" size={16} color="#FFF" />
                </Pressable>
              </View>
            ) : (
              <Text style={styles.closed}>{t("help.closedHint")}</Text>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  lead: { fontSize: 15, lineHeight: 21, color: colors.muted, marginBottom: 20 },
  group: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  q: { fontSize: 16, fontWeight: "600", color: colors.fg },
  a: { marginTop: 6, fontSize: 14, lineHeight: 20, color: colors.muted },
  meta: { marginTop: 6, fontSize: 12, color: colors.muted },
  empty: { padding: 16, fontSize: 14, color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 14, paddingBottom: 0 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.fg, borderColor: colors.fg },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.fg },
  chipTextOn: { color: "#FFF" },
  input: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    color: colors.fg,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textarea: { minHeight: 110, marginBottom: 4 },
  error: { marginHorizontal: 16, marginTop: 8, color: "#FF3B30", fontSize: 13 },
  submit: {
    margin: 14,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.72 },
  thread: { padding: 16, gap: 10, paddingBottom: 24 },
  bubbleWrap: { alignItems: "flex-start" },
  bubble: { maxWidth: "86%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: colors.fg, borderBottomRightRadius: 6 },
  bubbleAdmin: { backgroundColor: colors.surface, borderBottomLeftRadius: 6 },
  bubbleMeta: { fontSize: 10, fontWeight: "600", color: colors.muted, marginBottom: 4 },
  bubbleBody: { fontSize: 15, lineHeight: 21, color: colors.fg },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.fg,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
  },
  closed: { textAlign: "center", padding: 12, color: colors.muted, fontSize: 13 },
});
