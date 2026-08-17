import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import type { ApiSupportTicket } from "../../api/support";
import {
  submitSupportReply,
  submitSupportTicket,
  useSupportTicket,
  useSupportTickets,
} from "../support/useSupportTickets";

const CARD = "#1C1C1E";
const LINE = "rgba(84, 84, 88, 0.65)";
const MUTED = "#8E8E93";
const ACCENT = "#0A84FF";
const INPUT = "#2C2C2E";

type FaqItem = { q: string; a: string };

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("uz-UZ", {
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
  if (status === "open") return t("chat.support.statusOpen");
  if (status === "pending") return t("chat.support.statusPending");
  if (status === "resolved") return t("chat.support.statusResolved");
  if (status === "closed") return t("chat.support.statusClosed");
  return status;
}

function statusColor(status: string) {
  if (status === "open") return "#30D158";
  if (status === "pending") return "#FFD60A";
  if (status === "resolved") return ACCENT;
  return MUTED;
}

function FaqList({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View style={styles.card}>
      {items.map((item, i) => {
        const expanded = open === i;
        const last = i === items.length - 1;
        return (
          <Pressable
            key={item.q}
            onPress={() => setOpen(expanded ? null : i)}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="button"
          >
            <View style={[styles.faqRow, !last && styles.itemBorder]}>
              <View style={styles.faqCopy}>
                <Text style={styles.itemTitle}>{item.q}</Text>
                {expanded ? <Text style={styles.faqAnswer}>{item.a}</Text> : null}
              </View>
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={16}
                color={MUTED}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function TicketList({
  tickets,
  loading,
  empty,
  onOpen,
}: {
  tickets: ApiSupportTicket[];
  loading: boolean;
  empty: string;
  onOpen: (id: number) => void;
}) {
  const { t } = useTranslation();
  if (loading) {
    return <ActivityIndicator color="#FFFFFF" style={{ marginVertical: 16 }} />;
  }
  if (tickets.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyText}>{empty}</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {tickets.map((ticket, i) => (
        <Pressable
          key={ticket.id}
          onPress={() => onOpen(ticket.id)}
          style={({ pressed }) => pressed && styles.pressed}
          accessibilityRole="button"
        >
          <View style={[styles.ticketRow, i < tickets.length - 1 && styles.itemBorder]}>
            <View style={styles.faqCopy}>
              <View style={styles.ticketHead}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {ticket.subject}
                </Text>
                <Text style={[styles.statusDot, { color: statusColor(ticket.status) }]}>
                  {statusLabel(ticket.status, t)}
                </Text>
              </View>
              <Text style={styles.itemSubtitle} numberOfLines={2}>
                {ticket.last_message || ticket.body}
              </Text>
              <Text style={styles.meta}>
                #{ticket.id} · {formatWhen(ticket.updated_at)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={MUTED} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function SubmitForm({
  subjectPlaceholder,
  bodyPlaceholder,
  submitLabel,
  defaultSubject,
  category,
  chips,
  onCreated,
}: {
  subjectPlaceholder: string;
  bodyPlaceholder: string;
  submitLabel: string;
  defaultSubject: string;
  category: string;
  chips?: { id: string; label: string; subject: string }[];
  onCreated: (ticket: ApiSupportTicket) => void;
}) {
  const { t } = useTranslation();
  const [chip, setChip] = useState(chips?.[0]?.id ?? "");
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const subj = subject.trim() || defaultSubject;
    if (body.trim().length < 5) {
      setError(t("chat.support.bodyMin"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ticket = await submitSupportTicket({
        subject: subj,
        body: body.trim(),
        category,
        relatedType: "morph_ai",
      });
      setBody("");
      onCreated(ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.support.sendFail"));
    } finally {
      setBusy(false);
    }
  }, [body, category, defaultSubject, onCreated, subject, t]);

  return (
    <View style={styles.card}>
      {chips ? (
        <View style={styles.chipWrap}>
          {chips.map((c) => {
            const active = chip === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setChip(c.id);
                  if (c.subject) setSubject(c.subject);
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <TextInput
        value={subject}
        onChangeText={setSubject}
        placeholder={subjectPlaceholder}
        placeholderTextColor={MUTED}
        style={styles.input}
      />
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={bodyPlaceholder}
        placeholderTextColor={MUTED}
        style={[styles.input, styles.textarea]}
        multiline
        textAlignVertical="top"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={() => void send()}
        disabled={busy}
        style={({ pressed }) => [styles.submit, pressed && styles.pressed, busy && styles.disabled]}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="send" size={16} color="#FFFFFF" />
            <Text style={styles.submitText}>{submitLabel}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function MorphHelpCenterView({
  onOpenTicket,
}: {
  onOpenTicket: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { tickets, loading, refresh } = useSupportTickets("morph_help");
  const faq: FaqItem[] = [
    { q: t("chat.support.faq.tryOnQ"), a: t("chat.support.faq.tryOnA") },
    { q: t("chat.support.faq.limitQ"), a: t("chat.support.faq.limitA") },
    { q: t("chat.support.faq.chatQ"), a: t("chat.support.faq.chatA") },
    { q: t("chat.support.faq.waitQ"), a: t("chat.support.faq.waitA") },
  ];

  return (
    <>
      <Section title={t("chat.support.faqTitle")}>
        <FaqList items={faq} />
      </Section>
      <Section title={t("chat.support.askTitle")}>
        <SubmitForm
          subjectPlaceholder={t("chat.support.subjectPh")}
          bodyPlaceholder={t("chat.support.helpBodyPh")}
          submitLabel={t("chat.support.sendHelp")}
          defaultSubject={t("chat.support.helpSubject")}
          category="morph_ai:help"
          onCreated={(ticket) => {
            void refresh();
            onOpenTicket(ticket.id);
          }}
        />
      </Section>
      <Section title={t("chat.support.myTickets")}>
        <TicketList
          tickets={tickets}
          loading={loading}
          empty={t("chat.support.noHelp")}
          onOpen={onOpenTicket}
        />
      </Section>
    </>
  );
}

export function MorphReportProblemView({
  onOpenTicket,
}: {
  onOpenTicket: (id: number) => void;
}) {
  const { t } = useTranslation();
  const { tickets, loading, refresh } = useSupportTickets("morph_problem");
  const chips = [
    { id: "tryon", label: t("chat.support.topicTryOn"), subject: t("chat.support.subjectTryOn") },
    { id: "chat", label: t("chat.support.topicChat"), subject: t("chat.support.subjectChat") },
    { id: "limit", label: t("chat.support.topicLimit"), subject: t("chat.support.subjectLimit") },
    { id: "quality", label: t("chat.support.topicQuality"), subject: t("chat.support.subjectQuality") },
    { id: "other", label: t("chat.support.topicOther"), subject: t("chat.support.subjectOther") },
  ];

  return (
    <>
      <Text style={styles.lead}>{t("chat.support.reportLead")}</Text>
      <Section title={t("chat.support.reportTitle")}>
        <SubmitForm
          subjectPlaceholder={t("chat.support.subjectPh")}
          bodyPlaceholder={t("chat.support.reportBodyPh")}
          submitLabel={t("chat.support.sendReport")}
          defaultSubject={chips[0].subject}
          category="morph_ai:problem"
          chips={chips}
          onCreated={(ticket) => {
            void refresh();
            onOpenTicket(ticket.id);
          }}
        />
      </Section>
      <Section title={t("chat.support.myReports")}>
        <TicketList
          tickets={tickets}
          loading={loading}
          empty={t("chat.support.noReports")}
          onOpen={onOpenTicket}
        />
      </Section>
    </>
  );
}

export function MorphTicketThreadView({ ticketId }: { ticketId: number }) {
  const { t } = useTranslation();
  const { ticket, loading, refresh } = useSupportTicket(ticketId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<ScrollView>(null);

  const replies = ticket?.replies ?? [];

  useEffect(() => {
    const tmr = setTimeout(() => bottomRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(tmr);
  }, [replies.length, ticketId]);

  const send = useCallback(async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await submitSupportReply(ticketId, text);
      setText("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.support.sendFail"));
    } finally {
      setBusy(false);
    }
  }, [refresh, t, text, ticketId]);

  if (loading && !ticket) {
    return <ActivityIndicator color="#FFFFFF" style={{ marginTop: 32 }} />;
  }

  const canReply = ticket?.can_reply !== false && ticket?.status !== "closed";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={8}
    >
      <View style={styles.card}>
        <Text style={styles.itemTitle}>{ticket?.subject ?? "…"}</Text>
        <Text style={styles.meta}>
          #{ticketId} · {ticket ? statusLabel(ticket.status, t) : ""}
        </Text>
      </View>
      <ScrollView
        ref={bottomRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.thread}
        keyboardShouldPersistTaps="handled"
      >
        {replies.map((r) => {
          const mine = r.author_role === "user";
          return (
            <View key={`${r.id}-${r.created_at}`} style={[styles.bubbleWrap, mine && styles.bubbleMine]}>
              <View style={[styles.bubble, mine ? styles.bubbleUser : styles.bubbleAdmin]}>
                <Text style={[styles.bubbleMeta, mine && { color: "rgba(255,255,255,0.55)" }]}>
                  {mine ? t("chat.support.you") : r.author_name || "Support"} · {formatWhen(r.created_at)}
                </Text>
                <Text style={[styles.bubbleBody, mine && { color: "#FFFFFF" }]}>{r.body}</Text>
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
            placeholder={t("chat.support.replyPh")}
            placeholderTextColor={MUTED}
            style={styles.composerInput}
            multiline
          />
          <Pressable
            onPress={() => void send()}
            disabled={busy || !text.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.pressed,
              (busy || !text.trim()) && styles.disabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("chat.support.send")}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="send" size={16} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      ) : (
        <Text style={styles.closedHint}>{t("chat.support.closedHint")}</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 28 },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 12,
    fontSize: 13,
    fontWeight: "400",
    color: MUTED,
  },
  lead: {
    marginBottom: 20,
    marginHorizontal: 4,
    fontSize: 15,
    lineHeight: 21,
    color: MUTED,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    overflow: "hidden",
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqCopy: { flex: 1, minWidth: 0 },
  faqAnswer: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: LINE,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  itemSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  meta: {
    marginTop: 4,
    fontSize: 11,
    color: MUTED,
  },
  emptyText: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 14,
    color: MUTED,
  },
  ticketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ticketHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    fontSize: 11,
    fontWeight: "600",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: INPUT,
  },
  chipActive: { backgroundColor: "#FFFFFF" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#EBEBF5" },
  chipTextActive: { color: "#000000" },
  input: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: INPUT,
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textarea: { minHeight: 120, marginBottom: 4 },
  error: {
    marginHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
    color: "#FF453A",
  },
  submit: {
    margin: 14,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  thread: { paddingTop: 12, paddingBottom: 16, gap: 10 },
  bubbleWrap: { alignItems: "flex-start" },
  bubbleMine: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "86%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: ACCENT,
    borderBottomRightRadius: 6,
  },
  bubbleAdmin: {
    backgroundColor: CARD,
    borderBottomLeftRadius: 6,
  },
  bubbleMeta: {
    fontSize: 10,
    fontWeight: "600",
    color: MUTED,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  bubbleBody: {
    fontSize: 15,
    lineHeight: 21,
    color: "#FFFFFF",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 8,
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 16,
    backgroundColor: CARD,
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  closedHint: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    color: MUTED,
  },
});
