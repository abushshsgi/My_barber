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
  const { height: windowHeight } = useWindowDimensions();
  const [cardError, setCardError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
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
    setClaiming(true);
    try {
      const updated = await claimCardDeposit(deposit.id, receipt);
      setDeposit(updated);
      setPendingReview(true);
      deposits.refresh();
      Alert.alert("Yuborildi", "Chek yuborildi. Admin tekshiradi.");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Yuklash xatosi";
      Alert.alert("Xato", raw.replace(/^API \d+:\s*/, ""));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["bottom", "left", "right"]}>
      <NativeHeader title={t("wallet.topUp")} onBack={() => navigation.goBack()} border />
      {deposits.loading && !deposit ? (
        <View style={styles.boot}>
          <ActivityIndicator color={colors.fg} />
        </View>
      ) : (
        <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
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
              {paying ? (
                <View style={styles.timerCard}>
                  <Text style={styles.timerLabel}>Qolgan vaqt</Text>
                  <Text style={styles.timerValue}>{formatRemain(left)}</Text>
                  <View style={styles.track}>
                    <View style={[styles.trackFill, { width: `${Math.round(timerRatio * 100)}%` }]} />
                  </View>
                  <Text style={styles.timerHint}>
                    120 daqiqa. Shu vaqt ichida chiqib, to'ldirishga qaytib kirsangiz ham shu karta ochiladi.
                  </Text>
                </View>
              ) : (
                <View style={styles.reviewCard}>
                  <ActivityIndicator color={colors.forest} />
                  <Text style={styles.reviewTitle}>Admin tekshirmoqda</Text>
                  <Text style={styles.reviewHint}>
                    Chek yuborilgan. Balans tasdiqdan keyin oshadi. Sahifani yopsangiz ham shu so'rov saqlanadi.
                  </Text>
                </View>
              )}

              <View style={styles.amountLock}>
                <Text style={styles.amountLockLabel}>O'tkazma summasi</Text>
                <Text style={styles.amountLockValue}>
                  {formatSomLabel(parseDigits(String(deposit?.amount ?? 0)))}
                </Text>
              </View>

              {card ? (
                <View style={styles.bankCard}>
                  <View style={styles.bankTop}>
                    <Text style={styles.bankName} numberOfLines={1}>
                      {card.bank}
                    </Text>
                    <Ionicons name="card-outline" size={scale(22)} color="#C6EF4A" />
                  </View>
                  <Text style={styles.pan} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {groupCard(card.number || card.masked)}
                  </Text>
                  <Text style={styles.holder} numberOfLines={1}>
                    {card.cardholder}
                  </Text>
                  <Pressable
                    style={styles.copyPill}
                    onPress={() => void copy((card.number || card.masked).replace(/\D/g, ""), "Karta")}
                  >
                    <Ionicons
                      name={copied === "Karta" ? "checkmark" : "copy-outline"}
                      size={scale(16)}
                      color={colors.forest}
                    />
                    <Text style={styles.copyPillText}>
                      {copied === "Karta" ? "Nusxa olindi" : "Karta raqami"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {deposit ? (
                <Pressable
                  style={styles.refBox}
                  onPress={() => void copy(deposit.transaction_ref, "Izoh")}
                >
                  <View style={styles.refCopy}>
                    <Text style={styles.refLabel}>Izoh kodi · admin shu kod bilan solishtiradi</Text>
                    <Text
                      style={styles.refValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {deposit.transaction_ref}
                    </Text>
                  </View>
                  <Ionicons
                    name={copied === "Izoh" ? "checkmark-circle" : "copy-outline"}
                    size={scale(22)}
                    color={colors.lime}
                  />
                </Pressable>
              ) : null}

              {paying ? (
                <>
                  <Text style={styles.stepHint}>Chek rasmini tanlang. Yuborish tugmasi pastda turadi.</Text>
                  <Pressable style={styles.pickBtn} onPress={pickReceipt}>
                    <Ionicons name="image-outline" size={scale(20)} color={colors.fg} />
                    <Text style={styles.pickText}>
                      {receipt ? "Boshqa chek tanlash" : "O'tkazma chekini qo'shish"}
                    </Text>
                  </Pressable>
                  {receipt ? (
                    <Image
                      source={{ uri: receipt.uri }}
                      style={[styles.preview, { height: Math.max(verticalScale(96), Math.round(windowHeight * 0.18)) }]}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
        {paying ? (
          <View style={styles.footer}>
            <Pressable
              style={[styles.cta, styles.footerCta, (!receipt || claiming) && styles.ctaDisabled]}
              onPress={claim}
              disabled={!receipt || claiming}
            >
              {claiming ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.ctaText}>{receipt ? "Davom etish" : "Avval chek rasmini tanlang"}</Text>
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
  body: { flex: 1, width: "100%", minHeight: 0 },
  scroll: { flex: 1, width: "100%", minHeight: 0 },
  footer: {
    width: "100%",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(8),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  footerCta: { marginTop: 0 },
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
    gap: moderateScale(12),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
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
  balValue: { marginTop: verticalScale(2), color: colors.fg, fontSize: fontSize(22), fontWeight: "800" },
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
    minHeight: verticalScale(72),
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  presetActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  presetLabel: { fontSize: fontSize(16), fontWeight: "800", color: colors.fg },
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
    marginTop: verticalScale(20),
    minHeight: verticalScale(54),
    borderRadius: moderateScale(16),
    backgroundColor: colors.fg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(16),
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: "#FFF", fontSize: fontSize(16), fontWeight: "800", textAlign: "center" },
  timerCard: {
    marginTop: verticalScale(16),
    backgroundColor: colors.forest,
    borderRadius: moderateScale(22),
    padding: moderateScale(16),
  },
  timerLabel: { color: "rgba(255,255,255,0.72)", fontSize: fontSize(12), fontWeight: "700" },
  timerValue: {
    marginTop: verticalScale(4),
    color: colors.lime,
    fontSize: fontSize(36),
    fontWeight: "800",
    letterSpacing: 1,
  },
  track: {
    marginTop: verticalScale(12),
    height: verticalScale(6),
    borderRadius: moderateScale(6),
    backgroundColor: "rgba(255,255,255,0.16)",
    overflow: "hidden",
    width: "100%",
  },
  trackFill: { height: "100%", backgroundColor: colors.lime, borderRadius: moderateScale(6) },
  timerHint: {
    marginTop: verticalScale(10),
    color: "rgba(255,255,255,0.82)",
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
  },
  reviewCard: {
    marginTop: verticalScale(16),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(22),
    padding: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: moderateScale(8),
  },
  reviewTitle: { fontSize: fontSize(18), fontWeight: "800", color: colors.fg },
  reviewHint: { fontSize: fontSize(13), lineHeight: fontSize(18), color: colors.muted },
  amountLock: {
    marginTop: verticalScale(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: moderateScale(12),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  amountLockLabel: { flex: 1, fontSize: fontSize(13), color: colors.muted, fontWeight: "600" },
  amountLockValue: { fontSize: fontSize(16), fontWeight: "800", color: colors.fg },
  bankCard: {
    marginTop: verticalScale(12),
    backgroundColor: "#143528",
    borderRadius: moderateScale(22),
    padding: moderateScale(18),
    minHeight: verticalScale(168),
    justifyContent: "space-between",
  },
  bankTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: moderateScale(8) },
  bankName: { flex: 1, color: "rgba(255,255,255,0.72)", fontSize: fontSize(13), fontWeight: "700" },
  pan: {
    marginTop: verticalScale(18),
    color: "#FFFFFF",
    fontSize: fontSize(22),
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  holder: { marginTop: verticalScale(8), color: colors.lime, fontSize: fontSize(13), fontWeight: "700" },
  copyPill: {
    marginTop: verticalScale(14),
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: colors.lime,
    borderRadius: moderateScale(999),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  copyPillText: { color: colors.forest, fontSize: fontSize(12), fontWeight: "800" },
  refBox: {
    marginTop: verticalScale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(12),
    backgroundColor: colors.fg,
    borderRadius: moderateScale(18),
    padding: moderateScale(16),
  },
  refCopy: { flex: 1, minWidth: 0 },
  refLabel: { color: "rgba(255,255,255,0.62)", fontSize: fontSize(12), fontWeight: "600" },
  refValue: { marginTop: verticalScale(4), color: "#FFFFFF", fontSize: fontSize(22), fontWeight: "800" },
  pickBtn: {
    marginTop: verticalScale(16),
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
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
});
