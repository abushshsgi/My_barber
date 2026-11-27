import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EXPO_PRIMARY_BARCODE_TYPES,
  isDuplicateBarcodeSubmit,
  validateRetailBarcodeChecksum,
} from "@mybarber/scanner";
import { createHairScan, fetchHairScanHistory, type HairScan } from "../../../api/hair-advisor";
import { useHideTabBar } from "../../../hooks/useHideTabBar";
import { pickProductLabelFromGallery } from "../../../lib/product-label";
import { playBarcodeBeep, primeBarcodeBeep } from "../../../lib/barcode-beep";
import { toDataUrl } from "../../../lib/selfie";
import { resolveScanToAnalysis } from "../../../lib/hair-advisor-2/scan-flow";
import { isOnline, subscribeNetwork } from "../../../lib/network-status";
import type { MorphIngredientStackParamList } from "../../../navigation/MorphIngredientStack";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";
import { safeBottom, safeTop } from "../../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "IngredientScan">;
type Mode = "barcode" | "product_image";

export function HairAdvisor2ScanScreen({ navigation }: Props) {
  useHideTabBar();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const barcodeLock = useRef(false);
  const sessionRef = useRef(0);
  const lastBarcodeRef = useRef<{ code: string; at: number } | null>(null);
  const scanLine = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<Mode>("barcode");
  const [status, setStatus] = useState("");
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [history, setHistory] = useState<HairScan[]>([]);
  const [offline, setOffline] = useState(() => !isOnline());
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    void primeBarcodeBeep();
  }, []);

  useEffect(() => subscribeNetwork((online) => setOffline(!online)), []);

  useEffect(() => {
    if (!focused || !camPerm?.granted) return;
    if (camPerm.canAskAgain) void requestCamPerm();
  }, [focused, camPerm, requestCamPerm]);

  useEffect(() => {
    if (mode !== "barcode" || busy) {
      scanLine.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, {
          toValue: 1,
          duration: 2100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLine, {
          toValue: 0,
          duration: 2100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine, mode, busy]);

  useEffect(() => {
    if (busy) return;
    if (offline) {
      setStatus(t("scanner.status.offline", { defaultValue: "Offline — remote lookup unavailable" }));
      return;
    }
    setStatus(
      mode === "product_image"
        ? t("scanner.status.aimProduct", { defaultValue: "Mahsulotni ramkaga joylashtiring" })
        : t("scanner.status.autoScanActive", { defaultValue: "Avtomatik skanerlash faol" }),
    );
  }, [busy, mode, offline, t]);

  const bumpSession = () => {
    sessionRef.current += 1;
    return sessionRef.current;
  };

  const afterScan = useCallback(
    async (scan: HairScan, session: number) => {
      if (session !== sessionRef.current) return;
      if (scan.status === "failed") {
        setError(scan.error_message || t("scanner.errors.scanFailed", { defaultValue: "Skan muvaffaqiyatsiz" }));
        barcodeLock.current = false;
        setBusy(false);
        return;
      }
      if (scan.status === "product_not_found") {
        navigation.navigate("HairAdvisorRecover", { scanId: scan.id });
        barcodeLock.current = false;
        setBusy(false);
        return;
      }
      const resolved = await resolveScanToAnalysis(scan);
      if (session !== sessionRef.current) return;
      if ("needIngredients" in resolved) {
        navigation.navigate("HairAdvisorRecover", { scanId: scan.id });
        barcodeLock.current = false;
        setBusy(false);
        return;
      }
      navigation.navigate("HairAdvisorResult", { scanId: resolved.scan.id });
      barcodeLock.current = false;
      setBusy(false);
    },
    [navigation, t],
  );

  const processBarcode = useCallback(
    async (raw: string) => {
      const checksum = validateRetailBarcodeChecksum(raw);
      if (!checksum.valid) {
        setError(t("scanner.errors.invalidBarcode", { defaultValue: "Shtrix-kod formati noto‘g‘ri" }));
        return;
      }
      if (!isOnline()) {
        setOffline(true);
        setError(t("scanner.status.offline", { defaultValue: "Offline — remote lookup unavailable" }));
        return;
      }
      if (barcodeLock.current || busy) return;
      const now = Date.now();
      const last = lastBarcodeRef.current;
      if (last && isDuplicateBarcodeSubmit(checksum.normalized, last.code, last.at, now)) return;

      const session = bumpSession();
      barcodeLock.current = true;
      lastBarcodeRef.current = { code: checksum.normalized, at: now };
      setDetectedCode(checksum.normalized);
      setStatus(t("scanner.status.barcodeDetected", { defaultValue: "Shtrixkod aniqlandi" }));
      playBarcodeBeep();
      setBusy(true);
      setError(null);
      setStatus(t("scanner.status.lookingUpProduct", { defaultValue: "Mahsulot ma’lumotlari qidirilmoqda" }));
      try {
        const scan = await createHairScan({
          input_method: "barcode",
          barcode: checksum.normalized,
          idempotency_key: `ha2-${checksum.normalized}`,
        });
        if (session !== sessionRef.current) return;
        await afterScan(scan, session);
      } catch {
        if (session !== sessionRef.current) return;
        setError(t("scanner.errors.network", { defaultValue: "Internet aloqasini tekshiring" }));
        barcodeLock.current = false;
        setBusy(false);
      }
    },
    [afterScan, busy, t],
  );

  const submitManual = useCallback(async () => {
    const checksum = validateRetailBarcodeChecksum(manualCode);
    if (manualCode.replace(/\D/g, "").length < 8) {
      setError(t("scanner.errors.barcodeMin", { defaultValue: "Kamida 8 raqam" }));
      return;
    }
    if (!checksum.valid) {
      setError(t("scanner.errors.invalidBarcode", { defaultValue: "Shtrix-kod formati noto‘g‘ri" }));
      return;
    }
    if (!isOnline()) {
      setOffline(true);
      setError(t("scanner.status.offline", { defaultValue: "Offline — remote lookup unavailable" }));
      return;
    }
    setManualOpen(false);
    setManualCode("");
    const session = bumpSession();
    barcodeLock.current = true;
    setBusy(true);
    setDetectedCode(checksum.normalized);
    setError(null);
    try {
      const scan = await createHairScan({
        input_method: "manual_barcode",
        barcode: checksum.normalized,
        idempotency_key: `ha2-manual-${checksum.normalized}`,
      });
      if (session !== sessionRef.current) return;
      await afterScan(scan, session);
    } catch {
      if (session !== sessionRef.current) return;
      setError(t("scanner.errors.network", { defaultValue: "Internet aloqasini tekshiring" }));
      barcodeLock.current = false;
      setBusy(false);
    }
  }, [afterScan, manualCode, t]);

  const onGallery = useCallback(async () => {
    const uri = await pickProductLabelFromGallery();
    if (!uri) return;
    if (!isOnline()) {
      setOffline(true);
      setError(t("scanner.status.offline", { defaultValue: "Offline — remote lookup unavailable" }));
      return;
    }
    const session = bumpSession();
    setBusy(true);
    setError(null);
    setStatus(t("scanner.status.recognizingProduct", { defaultValue: "Mahsulot aniqlanmoqda…" }));
    try {
      const dataUrl = uri.startsWith("data:") ? uri : await toDataUrl(uri);
      if (!dataUrl) throw new Error("fail");
      const scan = await createHairScan({
        input_method: mode === "barcode" ? "gallery" : "camera_label",
        image: dataUrl,
      });
      if (session !== sessionRef.current) return;
      await afterScan(scan, session);
    } catch {
      if (session !== sessionRef.current) return;
      setError(t("scanner.errors.imageFailed", { defaultValue: "Rasm o'qilmadi" }));
      setBusy(false);
    }
  }, [afterScan, mode, t]);

  const onCapture = useCallback(async () => {
    if (mode !== "product_image" || busy) return;
    if (!isOnline()) {
      setOffline(true);
      setError(t("scanner.status.offline", { defaultValue: "Offline — remote lookup unavailable" }));
      return;
    }
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, base64: true });
      if (!photo?.base64) {
        setError(t("scanner.errors.imageFailed", { defaultValue: "Rasm o'qilmadi" }));
        return;
      }
      const session = bumpSession();
      const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      setBusy(true);
      setError(null);
      const scan = await createHairScan({ input_method: "camera_label", image: dataUrl });
      if (session !== sessionRef.current) return;
      await afterScan(scan, session);
    } catch {
      setError(t("scanner.errors.imageFailed", { defaultValue: "Rasm o'qilmadi" }));
      setBusy(false);
    }
  }, [afterScan, busy, mode, t]);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: safeTop(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel={t("common.back")}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t("scanner.title", { defaultValue: "Smart Scanner" })}</Text>
          <Text style={styles.headerSub}>{t("scanner.subtitle", { defaultValue: "Mahsulotni aniqlang va tahlil qiling." })}</Text>
        </View>
        <Pressable
          hitSlop={12}
          accessibilityLabel={t("scanner.history", { defaultValue: "Tarix" })}
          onPress={() => {
            void fetchHairScanHistory()
              .then(setHistory)
              .then(() => setHistoryOpen(true))
              .catch(() => undefined);
          }}
        >
          <Ionicons name="time-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.modeRow}>
        <ModeChip
          label={t("scanner.modeBarcode", { defaultValue: "Barcode" })}
          active={mode === "barcode"}
          onPress={() => setMode("barcode")}
        />
        <ModeChip
          label={t("scanner.modeImage", { defaultValue: "Rasm" })}
          active={mode === "product_image"}
          onPress={() => setMode("product_image")}
        />
      </View>

      <View style={styles.cameraOuter}>
        {camPerm?.granted && focused ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={
              mode === "barcode" ? { barcodeTypes: [...EXPO_PRIMARY_BARCODE_TYPES] } : undefined
            }
            onBarcodeScanned={
              mode === "barcode" && !busy
                ? ({ data }) => {
                    void processBarcode(String(data));
                  }
                : undefined
            }
          />
        ) : (
          <View style={styles.permBlock}>
            <Text style={styles.sub}>{t("hairAdvisor.cameraDenied", { defaultValue: "Kamera uchun ruxsat kerak" })}</Text>
            <Pressable style={styles.permBtn} onPress={() => void requestCamPerm()}>
              <Text style={styles.permBtnText}>{t("common.confirm", { defaultValue: "Ruxsat berish" })}</Text>
            </Pressable>
          </View>
        )}
        <View style={[styles.frame, mode === "barcode" ? styles.frameBarcode : styles.frameImage]}>
          {mode === "barcode" && !busy ? (
            <Animated.View
              style={[
                styles.line,
                {
                  transform: [
                    {
                      translateY: scanLine.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, verticalScale(100)],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : null}
        </View>
        {busy ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.lookup}>{status}</Text>
            {detectedCode ? <Text style={styles.code}>{detectedCode}</Text> : null}
            <Pressable
              onPress={() => {
                bumpSession();
                barcodeLock.current = false;
                setBusy(false);
                setError(null);
              }}
            >
              <Text style={styles.cancelTxt}>{t("scanner.cancel", { defaultValue: "Bekor qilish" })}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {offline && !busy ? (
        <Text style={styles.error} accessibilityRole="alert">
          {t("scanner.status.offline", { defaultValue: "Offline — remote lookup unavailable" })}
        </Text>
      ) : null}
      {status && !busy ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.footer, { paddingBottom: safeBottom(insets.bottom, 16) }]}>
        <Pressable style={styles.sideCol} onPress={() => void onGallery()}>
          <View style={styles.sideBtn}>
            <Ionicons name="images-outline" size={22} color="#fff" />
          </View>
          <Text style={styles.sideLabel}>{t("scanner.gallery", { defaultValue: "Galereya" })}</Text>
        </Pressable>

        {mode === "product_image" ? (
          <Pressable style={styles.mainBtn} onPress={() => void onCapture()} disabled={busy}>
            <View style={styles.mainInner} />
          </Pressable>
        ) : (
          <Pressable style={styles.sideCol} onPress={() => setManualOpen(true)}>
            <View style={styles.sideBtn}>
              <Ionicons name="keypad-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.sideLabel}>{t("scanner.enterCode", { defaultValue: "Kod kiritish" })}</Text>
          </Pressable>
        )}

        <Pressable style={styles.sideCol} onPress={() => setTorch((v) => !v)}>
          <View style={[styles.sideBtn, torch && styles.sideBtnOn]}>
            <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color={torch ? "#111" : "#fff"} />
          </View>
          <Text style={styles.sideLabel}>{t("scanner.torch", { defaultValue: "Chiroq" })}</Text>
        </Pressable>
      </View>

      <Modal visible={manualOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("scanner.enterCode", { defaultValue: "Kod kiritish" })}</Text>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="number-pad"
              placeholder="EAN / UPC"
              style={styles.input}
            />
            <Pressable style={styles.permBtn} onPress={() => void submitManual()}>
              <Text style={styles.permBtnText}>{t("scanner.lookingUp", { defaultValue: "Qidirish" })}</Text>
            </Pressable>
            <Pressable onPress={() => setManualOpen(false)}>
              <Text style={styles.link}>{t("scanner.cancel", { defaultValue: "Bekor" })}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={historyOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("scanner.history", { defaultValue: "Skanlar tarixi" })}</Text>
            <ScrollView style={{ maxHeight: verticalScale(320) }}>
              {history.map((h) => (
                <Pressable
                  key={h.id}
                  style={styles.histRow}
                  onPress={() => {
                    setHistoryOpen(false);
                    navigation.navigate("HairAdvisorResult", { scanId: h.id });
                  }}
                >
                  <Text style={styles.histTitle}>{h.barcode || h.care_product?.name || h.id.slice(0, 8)}</Text>
                  <Text style={styles.histMeta}>{h.status}</Text>
                </Pressable>
              ))}
              {history.length === 0 ? <Text style={styles.histMeta}>—</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setHistoryOpen(false)}>
              <Text style={styles.link}>{t("scanner.cancel", { defaultValue: "Yopish" })}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(4),
  },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { ...morphFont, color: "#fff", fontSize: fontSize(17), fontWeight: "600" },
  headerSub: { ...morphFont, color: "rgba(255,255,255,0.7)", fontSize: fontSize(11), marginTop: 2, textAlign: "center" },
  modeRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  chipOn: { backgroundColor: "#fff" },
  chipText: { ...morphFont, color: "#fff", fontSize: fontSize(12), fontWeight: "600" },
  chipTextOn: { color: "#111" },
  cameraOuter: {
    flex: 1,
    marginHorizontal: scale(20),
    marginTop: verticalScale(14),
    marginBottom: verticalScale(8),
    borderRadius: moderateScale(22),
    overflow: "hidden",
    backgroundColor: "#111",
  },
  frame: {
    position: "absolute",
    left: scale(28),
    right: scale(28),
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: moderateScale(16),
    overflow: "hidden",
  },
  frameBarcode: { top: "38%", height: verticalScale(120) },
  frameImage: { top: scale(28), bottom: scale(28) },
  line: { height: 2, backgroundColor: "rgba(255,255,255,0.4)", marginHorizontal: 8 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    gap: 8,
  },
  lookup: { ...morphFont, color: "#fff", fontWeight: "600" },
  code: { ...morphFont, color: "rgba(255,255,255,0.7)", fontSize: fontSize(12) },
  cancelTxt: { ...morphFont, color: "#fff", marginTop: 8, textDecorationLine: "underline" },
  permBlock: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  permBtn: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, alignItems: "center" },
  permBtnText: { ...morphFont, fontWeight: "700", color: "#111" },
  status: { ...morphFont, color: "#E5E5E5", textAlign: "center", marginHorizontal: 20, fontSize: fontSize(13) },
  sub: { ...morphFont, color: "#A3A3A3", textAlign: "center", marginTop: 6, fontSize: fontSize(15) },
  error: { ...morphFont, color: "#F87171", textAlign: "center", marginHorizontal: 20, fontSize: fontSize(13) },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", gap: scale(28), paddingTop: verticalScale(8) },
  sideCol: { alignItems: "center", gap: 4 },
  sideBtn: {
    width: scale(48),
    height: scale(48),
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sideBtnOn: { backgroundColor: "#fff" },
  sideLabel: { ...morphFont, color: "rgba(255,255,255,0.8)", fontSize: fontSize(10) },
  mainBtn: {
    width: scale(58),
    height: scale(58),
    borderRadius: 29,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  mainInner: { width: scale(18), height: scale(18), borderRadius: 9, borderWidth: 2, borderColor: "#111" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: "70%" },
  modalTitle: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", marginBottom: 12 },
  input: {
    ...morphFont,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: fontSize(16),
    marginBottom: 12,
  },
  histRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8E8EB" },
  histTitle: { ...morphFont, fontWeight: "600", color: "#111" },
  histMeta: { ...morphFont, color: "#71717A", fontSize: fontSize(12) },
  link: { ...morphFont, textAlign: "center", marginTop: 12, color: "#71717A", fontWeight: "600" },
});
