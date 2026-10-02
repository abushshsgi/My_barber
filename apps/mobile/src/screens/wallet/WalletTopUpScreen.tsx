import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHideTabBar } from "../../hooks/useHideTabBar";
import {
  claimCardDeposit,
  fetchReceivingCard,
  initCardDeposit,
  MIN_TOPUP_AMOUNT,
  type CardDeposit,
} from "../../api/wallet";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useCardDeposits, useWalletMe } from "../../hooks/useWallet";
import { formatSomAmount, formatSomLabel } from "../../lib/wallet-format";
import type { WalletStackParamList } from "../../navigation/WalletStack";
import { colors } from "../../theme/colors";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<WalletStackParamList, "WalletTopUp">;

const PRESETS = [50_000, 100_000, 200_000, 500_000] as const;
const OPEN = new Set(["awaiting_payment", "claimed"]);
/** Backend `INIT_TTL_HOURS` — karta berilgach o'tkazma oynasi. */
const PAY_WINDOW_MS = 2 * 60 * 60 * 1000;

function parseDigits(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d ? Number(d) : 0;
}

function groupCard(raw: string) {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function remainMs(iso: string | null | undefined, now: number) {
  if (!iso) return 0;
  const end = new Date(iso).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - now);
}

function InfoLine({
  label,
  value,
  onPress,
  copied,
  last,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  copied?: boolean;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.infoLine, !last && styles.infoLineBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
      {onPress ? (
        <Ionicons
          name={copied ? "checkmark" : "copy-outline"}
          size={scale(14)}
          color={colors.muted}
        />
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

function ResultStep({
  sending,
  status,
  amount,
  comment,
  merchant,
  note,
  onWallet,
  onRetry,
}: {
  sending: boolean;
  status: string;
  amount: string;
  comment: string;
  merchant: string;
  note: string;
  onWallet: () => void;
  onRetry: () => void;
}) {
  const rejected = status === "rejected";
  const approved = status === "approved";
  const title = sending
    ? "Chek yuborilmoqda"
    : approved
      ? "Balans to'ldirildi"
      : rejected
        ? "To'lov rad etildi"
        : "Tekshiruvga yuborildi";
  const body = sending
    ? "Chek admin paneliga ketmoqda. Shu sahifada qoling."
    : approved
      ? "Admin tasdiqladi. Summa hamyoningizga tushdi."
      : rejected
        ? note || "Admin to'lovni rad etdi. Yangi so'rov ochishingiz mumkin."
        : "Admin chekni izoh kodi bilan solishtiradi. Tasdiqlangach balans yangilanadi.";
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultIcon}>
        {sending ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <Ionicons
            name={rejected ? "close" : approved ? "checkmark" : "time-outline"}
            size={scale(22)}
            color={colors.fg}
          />
        )}
      </View>
      <Text style={styles.resultTitle}>{title}</Text>
      <Text style={styles.resultBody}>{body}</Text>
      <Text style={styles.resultAmount}>{amount}</Text>
      {comment ? <Text style={styles.resultMeta}>Izoh · {comment}</Text> : null}
      {merchant ? <Text style={styles.resultMeta}>Merchant · {merchant}</Text> : null}
      {!sending && rejected ? (
        <Pressable style={styles.cta} onPress={onRetry}>
          <Text style={styles.ctaText}>Qayta urinish</Text>
        </Pressable>
      ) : null}
      {!sending ? (
        <Pressable style={[styles.cta, rejected && styles.secondaryCta]} onPress={onWallet}>
          <Text style={[styles.ctaText, rejected && styles.secondaryCtaText]}>Hamyonga qaytish</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function formatRemain(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function WalletTopUpScreen({ navigation }: Props) {
  const { t } = useTranslation();
  useHideTabBar();
  const me = useWalletMe();
  const [amount, setAmount] = useState(100_000);
  const [custom, setCustom] = useState("");
  const [deposit, setDeposit] = useState<CardDeposit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [pendingReview, setPendingReview] = useState(false);
  const [receipt, setReceipt] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "sending" | "done">("idle");
  const { height: windowHeight } = useWindowDimensions();
  const [cardError, setCardError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [boxH, setBoxH] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deposits = useCardDeposits(true);

  useEffect(() => {
    void fetchReceivingCard()
      .then(() => setCardError(null))
      .catch((e) => {
        setCardError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Karta sozlanmagan");
      });
  }, []);

  useEffect(() => {
    const open = deposits.deposits.find(
      (d) => OPEN.has(d.status) && remainMs(d.expires_at, Date.now()) > 0,
    );
    if (open && !deposit) setDeposit(open);
  }, [deposits.deposits, deposit]);

  useEffect(() => {
    if (!deposit || !OPEN.has(deposit.status)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deposit]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!pendingReview || !deposit) return;
    const latest = deposits.deposits.find((d) => d.id === deposit.id);
    if (!latest) return;
    if (latest.status === "approved") {
      setPendingReview(false);
      setDeposit(latest);
      me.refresh();
      Alert.alert("Muvaffaqiyat", "Balans to'ldirildi. Admin tasdiqladi.");
    } else if (latest.status === "rejected") {
      setPendingReview(false);
      Alert.alert("Rad etildi", latest.review_note || "To'lov rad etildi.");
    }
  }, [deposits.deposits, pendingReview, deposit, me]);

  const activeCustom = custom.length > 0;
  const effective = activeCustom ? parseDigits(custom) : amount;
  const left = deposit ? remainMs(deposit.expires_at, now) : 0;
  const paying = deposit?.status === "awaiting_payment" && left > 0;
  const reviewing = deposit?.status === "claimed";
  const timedOut = deposit?.status === "awaiting_payment" && left <= 0;
  const card = deposit?.receiving_card;
  const timerRatio = Math.min(1, left / PAY_WINDOW_MS);

  const start = async () => {
    if (submitting) return;
    if (effective < MIN_TOPUP_AMOUNT) {
      Alert.alert("Xato", `Minimal summa — ${formatSomLabel(MIN_TOPUP_AMOUNT)}`);
      return;
    }
    setSubmitting(true);
    try {
      const d = await initCardDeposit(effective);
      setDeposit(d);
      setReceipt(null);
      setNow(Date.now());
    } catch (e) {
      Alert.alert("Xato", e instanceof Error ? e.message : "Boshlab bo'lmadi");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      const { setStringAsync } = await import("expo-clipboard");
      await setStringAsync(value);
      setCopied(label);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1400);
    } catch {
      Alert.alert(label, value);
    }
  };

  const pickReceipt = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Ruxsat", "Galereyaga ruxsat bering.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if ((asset.fileSize ?? 0) > 8 * 1024 * 1024) {
      Alert.alert("Xato", "Rasm 8 MB dan katta bo'lmasin.");
      return;
    }
    const type =
      asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    const rawName = asset.fileName || "receipt.jpg";
    const name = /\.(jpe?g|png|webp|heic|heif)$/i.test(rawName) ? rawName : "receipt.jpg";
    setReceipt({ uri: asset.uri, name, type });
  };

  const claim = async () => {
    if (!deposit || !receipt || claiming) return;
    setClaimError(null);
    setClaiming(true);
    setPhase("sending");
    try {
      const updated = await claimCardDeposit(deposit.id, receipt);
      setDeposit(updated);
      setPendingReview(true);
      setPhase("done");
      deposits.refresh();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Yuklash xatosi";
      setClaimError(raw.replace(/^API \d+:\s*/, ""));
      setPhase("idle");
    } finally {
      setClaiming(false);
    }
  };

  const showResult =
    phase === "sending" ||
    phase === "done" ||
    deposit?.status === "claimed" ||
    deposit?.status === "approved" ||
    deposit?.status === "rejected";

  return (
    <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
      <NativeHeader title={t("wallet.topUp")} onBack={() => navigation.goBack()} border />
      {deposits.loading && !deposit ? (
        <View style={styles.boot}>
          <ActivityIndicator color={colors.fg} />
        </View>
      ) : showResult ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ResultStep
            sending={phase === "sending"}
            status={deposit?.status || "claimed"}
            amount={formatSomLabel(parseDigits(String(deposit?.amount ?? 0)))}
            comment={deposit?.transaction_ref || ""}
            merchant={deposit?.merchant_ref || ""}
            note={deposit?.review_note || ""}
            onWallet={() => navigation.goBack()}
            onRetry={() => {
              setPhase("idle");
              setDeposit(null);
              setReceipt(null);
              setPendingReview(false);
              setClaimError(null);
            }}
          />
        </ScrollView>
      ) : (
        <View
          style={styles.body}
          onLayout={(e) => {
            const next = Math.round(e.nativeEvent.layout.height);
            if (next > 0 && Math.abs(next - boxH) > 1) setBoxH(next);
          }}
        >
        <ScrollView
          style={[
            styles.scroll,
            paying
              ? styles.scrollFlex
              : boxH > 0
                ? { height: boxH, maxHeight: boxH }
                : null,
          ]}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          scrollEnabled
          bounces
          showsVerticalScrollIndicator
        >
          <View style={styles.balCard}>
            <View style={styles.balIcon}>
              <Ionicons name="wallet-outline" size={scale(18)} color={colors.fg} />
            </View>
            <View style={styles.balCopy}>
              <Text style={styles.balLabel}>Hamyon balansi</Text>
              <Text style={styles.balValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatSomLabel(me.balance)}
              </Text>
            </View>
          </View>

          {cardError ? <Text style={styles.cardError}>{cardError}</Text> : null}
          {timedOut ? (
            <Text style={styles.timeout}>
              2 soat tugadi. Karta yopildi. Yangi summa tanlab, qaytadan oching.
            </Text>
          ) : null}

          {!paying && !reviewing ? (
            <>
              <Text style={styles.lead}>Summani tanlang. Karta shundan keyin ochiladi.</Text>
              <View style={styles.grid}>
                {PRESETS.map((p) => {
                  const active = !activeCustom && amount === p;
                  return (
                    <Pressable
                      key={p}
                      style={[styles.preset, active && styles.presetActive]}
                      onPress={() => {
                        setAmount(p);
                        setCustom("");
                      }}
                    >
                      <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                        {formatSomAmount(p)}
                      </Text>
                      <Text style={[styles.presetSub, active && styles.presetSubActive]}>so'm</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.section}>Boshqa summa</Text>
              <TextInput
                style={styles.input}
                placeholder="150 000"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                value={custom}
                onChangeText={(raw) => {
                  const n = parseDigits(raw);
                  setCustom(n ? formatSomAmount(n) : "");
                  if (n) setAmount(n);
                }}
              />
              <Text style={styles.help}>Kamida {formatSomLabel(MIN_TOPUP_AMOUNT)}</Text>

              <Pressable
                style={[styles.cta, (submitting || !!cardError) && styles.ctaDisabled]}
                onPress={start}
                disabled={submitting || !!cardError}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.ctaText}>Kartani ochish · {formatSomLabel(effective || amount)}</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
            <View style={styles.sheet}>
              {paying ? (
                <View style={styles.metaRow}>
                  <View style={styles.metaCell}>
                    <Text style={styles.kicker}>Qolgan vaqt</Text>
                    <Text style={styles.metaValue}>{formatRemain(left)}</Text>
                  </View>
                  <View style={styles.metaRule} />
                  <View style={[styles.metaCell, styles.metaEnd]}>
                    <Text style={styles.kicker}>Summa</Text>
                    <Text style={styles.metaValue} numberOfLines={1} adjustsFontSizeToFit>
                      {formatSomLabel(parseDigits(String(deposit?.amount ?? 0)))}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.reviewLine}>
                  <ActivityIndicator color={colors.fg} size="small" />
                  <Text style={styles.reviewText}>Admin tekshirmoqda. Chek saqlangan.</Text>
                </View>
              )}
              {paying ? (
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${Math.round(timerRatio * 100)}%` }]} />
                </View>
              ) : null}

              {card ? (
                <InfoLine
                  label="Karta"
                  value={groupCard(card.number || card.masked)}
                  copied={copied === "Karta"}
                  onPress={() => void copy((card.number || card.masked).replace(/\D/g, ""), "Karta")}
                />
              ) : null}
              {card ? <InfoLine label="Egasi" value={card.cardholder} /> : null}
              {card ? <InfoLine label="Bank" value={card.bank} /> : null}
              {deposit ? (
                <InfoLine
                  label="Izoh kodi"
                  value={deposit.transaction_ref}
                  copied={copied === "Izoh"}
                  onPress={() => void copy(deposit.transaction_ref, "Izoh")}
                />
              ) : null}
              {deposit?.merchant_ref ? (
                <InfoLine
                  label="Merchant"
                  value={deposit.merchant_ref}
                  copied={copied === "Merchant"}
                  onPress={() => void copy(deposit.merchant_ref, "Merchant")}
                  last
                />
              ) : null}
            </View>

            {paying ? (
              <>
                <Text style={styles.stepHint}>
                  O'tkazma izohiga kodni yozing, chek rasmini tanlang va Davom etish ni bosing.
                </Text>
                <Pressable style={styles.pickBtn} onPress={pickReceipt}>
                  <Ionicons name="image-outline" size={scale(16)} color={colors.fg} />
                  <Text style={styles.pickText}>
                    {receipt ? "Boshqa chek" : "Chek rasmini tanlang"}
                  </Text>
                </Pressable>
                {receipt ? (
                  <Image
                    source={{ uri: receipt.uri }}
                    style={[
                      styles.preview,
                      { height: Math.min(verticalScale(120), Math.round(windowHeight * 0.16)) },
                    ]}
                  />
                ) : null}
              </>
            ) : null}
            </>
          )}
        </ScrollView>
        {paying ? (
          <View style={styles.footer}>
            {claimError ? <Text style={styles.cardError}>{claimError}</Text> : null}
            <Pressable
              style={[styles.cta, styles.footerCta, (!receipt || claiming) && styles.ctaDisabled]}
              onPress={() => void claim()}
              disabled={!receipt || claiming}
            >
              {claiming ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.ctaText}>{receipt ? "Davom etish" : "Avval chek tanlang"}</Text>
              )}
            </Pressable>
          </View>
        ) : null}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: "100%", backgroundColor: colors.bg },
  body: { flex: 1, width: "100%", minHeight: 0, overflow: "hidden" },
  scroll: { width: "100%", flexGrow: 0 },
  scrollFlex: { flex: 1, flexGrow: 1, minHeight: 0 },
  content: {
    width: "100%",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(28),
  },
  boot: { flex: 1, alignItems: "center", justifyContent: "center" },
  balCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  balIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(14),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
  },
  balCopy: { flex: 1, minWidth: 0 },
  balLabel: { fontSize: fontSize(12), color: colors.muted, fontWeight: "600" },
  balValue: { marginTop: verticalScale(1), color: colors.fg, fontSize: fontSize(16), fontWeight: "800" },
  lead: {
    marginTop: verticalScale(18),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.muted,
    fontWeight: "600",
  },
  cardError: { marginTop: verticalScale(10), color: "#B42318", fontSize: fontSize(13), lineHeight: fontSize(18) },
  timeout: {
    marginTop: verticalScale(12),
    color: "#9A3412",
    backgroundColor: "#FFEDD5",
    borderRadius: moderateScale(14),
    padding: moderateScale(12),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    fontWeight: "600",
  },
  section: {
    marginTop: verticalScale(18),
    marginBottom: verticalScale(8),
    fontSize: fontSize(15),
    fontWeight: "700",
    color: colors.fg,
  },
  grid: {
    marginTop: verticalScale(12),
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: moderateScale(8),
  },
  preset: {
    width: "48%",
    minHeight: verticalScale(52),
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  presetActive: { backgroundColor: colors.fg, borderColor: colors.fg },
  presetLabel: { fontSize: fontSize(14), fontWeight: "800", color: colors.fg },
  presetLabelActive: { color: "#FFFFFF" },
  presetSub: { marginTop: verticalScale(2), fontSize: fontSize(12), color: colors.muted, fontWeight: "600" },
  presetSubActive: { color: "rgba(255,255,255,0.72)" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontSize: fontSize(16),
    fontWeight: "700",
    color: colors.fg,
    backgroundColor: colors.surface,
    width: "100%",
  },
  help: { marginTop: verticalScale(8), fontSize: fontSize(12), color: colors.muted },
  cta: {
    marginTop: verticalScale(16),
    minHeight: verticalScale(46),
    borderRadius: moderateScale(14),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(16),
  },
  inlineCta: { marginTop: verticalScale(8) },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: colors.surface, fontSize: fontSize(14), fontWeight: "800", textAlign: "center" },
  sheet: {
    marginTop: verticalScale(10),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  metaRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: scale(12), paddingTop: verticalScale(10) },
  metaCell: { flex: 1, minWidth: 0 },
  metaEnd: { alignItems: "flex-end" },
  metaRule: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.border, marginHorizontal: scale(10) },
  kicker: { fontSize: fontSize(11), color: colors.muted, fontWeight: "600" },
  metaValue: { marginTop: verticalScale(2), fontSize: fontSize(15), fontWeight: "800", color: colors.fg },
  track: {
    marginTop: verticalScale(8),
    marginHorizontal: scale(12),
    height: verticalScale(3),
    borderRadius: moderateScale(3),
    backgroundColor: colors.promo,
    overflow: "hidden",
  },
  trackFill: { height: "100%", backgroundColor: colors.fg },
  reviewLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
  },
  reviewText: { flex: 1, fontSize: fontSize(13), fontWeight: "600", color: colors.fg },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(9),
    minHeight: verticalScale(36),
  },
  infoLineBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  infoLabel: { width: scale(72), fontSize: fontSize(11), color: colors.muted, fontWeight: "600" },
  infoValue: { flex: 1, minWidth: 0, fontSize: fontSize(13), fontWeight: "700", color: colors.fg },
  pickBtn: {
    marginTop: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    backgroundColor: colors.surface,
  },
  stepHint: {
    marginTop: verticalScale(14),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: colors.muted,
    fontWeight: "600",
  },
  pickText: { flex: 1, minWidth: 0, fontSize: fontSize(14), fontWeight: "700", color: colors.fg },
  preview: {
    marginTop: verticalScale(12),
    borderRadius: moderateScale(16),
    width: "100%",
    backgroundColor: colors.promo,
  },
  footer: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(10),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  footerCta: { marginTop: 0 },
  secondaryCta: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryCtaText: { color: colors.fg },
  resultCard: {
    marginTop: verticalScale(8),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(20),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(22),
  },
  resultIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: moderateScale(16),
    backgroundColor: colors.promo,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: {
    marginTop: verticalScale(14),
    fontSize: fontSize(22),
    fontWeight: "800",
    color: colors.fg,
  },
  resultBody: {
    marginTop: verticalScale(8),
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: colors.muted,
    fontWeight: "600",
  },
  resultAmount: {
    marginTop: verticalScale(16),
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
  },
  resultMeta: {
    marginTop: verticalScale(6),
    fontSize: fontSize(13),
    fontWeight: "700",
    color: colors.fg,
  },
});
