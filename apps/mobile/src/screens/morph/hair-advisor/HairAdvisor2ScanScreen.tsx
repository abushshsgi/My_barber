import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createHairScan, fetchHairScanHistory, type HairScan } from "../../../api/hair-advisor";
import { useHideTabBar } from "../../../hooks/useHideTabBar";
import { pickProductLabelFromGallery } from "../../../lib/product-label";
import { playBarcodeBeep, primeBarcodeBeep } from "../../../lib/barcode-beep";
import { toDataUrl } from "../../../lib/selfie";
import { resolveScanToAnalysis } from "../../../lib/hair-advisor-2/scan-flow";
import type { MorphIngredientStackParamList } from "../../../navigation/MorphIngredientStack";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";
import { safeBottom, safeTop } from "../../../lib/safe-area";

type Props = NativeStackScreenProps<MorphIngredientStackParamList, "IngredientScan">;

const BARCODE_TYPES = ["ean13", "ean8", "upc_a", "upc_e"] as const;

export function HairAdvisor2ScanScreen({ navigation }: Props) {
  useHideTabBar();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const barcodeLock = useRef(false);
  const scanLine = useRef(new Animated.Value(0)).current;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HairScan[]>([]);

  useEffect(() => {
    void primeBarcodeBeep();
  }, []);

  useEffect(() => {
    if (!focused || !camPerm?.granted) return;
    if (camPerm.canAskAgain) void requestCamPerm();
  }, [focused, camPerm, requestCamPerm]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine]);

  const processBarcode = useCallback(
    async (code: string) => {
      if (code.length < 8 || barcodeLock.current) return;
      barcodeLock.current = true;
      playBarcodeBeep();
      setBusy(true);
      setError(null);
      try {
        const scan = await createHairScan({ input_method: "barcode", barcode: code, idempotency_key: `ha2-${code}` });
        if (scan.status === "failed") {
          setError(scan.error_message || "Shtrix-kod aniqlanmadi");
          barcodeLock.current = false;
          return;
        }
        if (scan.status === "product_not_found") {
          navigation.navigate("HairAdvisorRecover", { scanId: scan.id });
          return;
        }
        const resolved = await resolveScanToAnalysis(scan);
        if ("needIngredients" in resolved) {
          navigation.navigate("HairAdvisorRecover", { scanId: scan.id });
          return;
        }
        navigation.navigate("HairAdvisorResult", { scanId: resolved.scan.id });
      } catch {
        setError("Internet aloqasini tekshiring");
        barcodeLock.current = false;
      } finally {
        setBusy(false);
      }
    },
    [navigation],
  );

  const onBarcode = ({ data }: { data: string }) => {
    if (busy) return;
    void processBarcode(data.replace(/\D/g, ""));
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: safeTop(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Orqaga">
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Skanerlash</Text>
        <Pressable
          hitSlop={12}
          accessibilityLabel="Tarix"
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

      <View style={styles.instructions}>
        <Text style={styles.title}>Mahsulotni skanerlang</Text>
        <Text style={styles.sub}>Shtrix-kodni ramka ichiga joylashtiring</Text>
      </View>

      <View style={styles.cameraOuter}>
        {camPerm?.granted && focused ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            onBarcodeScanned={busy ? undefined : onBarcode}
          />
        ) : (
          <View style={styles.permBlock}>
            <Text style={styles.sub}>Kamera uchun ruxsat kerak</Text>
            <Pressable style={styles.permBtn} onPress={() => void requestCamPerm()}>
              <Text style={styles.permBtnText}>Ruxsat berish</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.frame}>
          <Animated.View
            style={[
              styles.line,
              {
                transform: [
                  {
                    translateY: scanLine.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, verticalScale(200)],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
        {busy ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.lookup}>Mahsulot qidirilmoqda…</Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.footer, { paddingBottom: safeBottom(insets.bottom, 16) }]}>
        <Pressable
          style={styles.sideBtn}
          onPress={async () => {
            const uri = await pickProductLabelFromGallery();
            if (!uri) return;
            setBusy(true);
            try {
              const dataUrl = uri.startsWith("data:") ? uri : await toDataUrl(uri);
              if (!dataUrl) throw new Error("fail");
              const scan = await createHairScan({ input_method: "gallery", image: dataUrl });
              const resolved = await resolveScanToAnalysis(scan);
              if ("needIngredients" in resolved) {
                navigation.navigate("HairAdvisorRecover", { scanId: scan.id });
                return;
              }
              navigation.navigate("HairAdvisorResult", { scanId: resolved.scan.id });
            } catch {
              setError("Rasm o'qilmadi");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Ionicons name="images-outline" size={22} color="#fff" />
        </Pressable>
        <Pressable style={styles.mainBtn} onPress={() => { barcodeLock.current = false; setError(null); }}>
          <View style={styles.mainInner} />
        </Pressable>
        <Pressable style={styles.sideBtn} onPress={() => setTorch((v) => !v)}>
          <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color="#fff" />
        </Pressable>
      </View>

      <Modal visible={historyOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Skanlar tarixi</Text>
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
              {history.length === 0 ? <Text style={styles.histMeta}>Tarix bo'sh</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setHistoryOpen(false)}>
              <Text style={styles.link}>Yopish</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#080808" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(8),
  },
  headerTitle: { ...morphFont, color: "#fff", fontSize: fontSize(17), fontWeight: "600" },
  instructions: { paddingHorizontal: scale(20), paddingTop: verticalScale(4) },
  title: { ...morphFont, color: "#fff", textAlign: "center", fontSize: fontSize(26), fontWeight: "600" },
  sub: { ...morphFont, color: "#A3A3A3", textAlign: "center", marginTop: 6, fontSize: fontSize(15) },
  cameraOuter: {
    flex: 1,
    marginHorizontal: scale(20),
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
    borderRadius: moderateScale(22),
    overflow: "hidden",
    backgroundColor: "#111",
  },
  frame: {
    ...StyleSheet.absoluteFill,
    margin: scale(24),
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: moderateScale(18),
    overflow: "hidden",
  },
  line: { height: 2, backgroundColor: "rgba(255,255,255,0.35)", marginHorizontal: 8 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)", gap: 8 },
  lookup: { ...morphFont, color: "#fff", fontWeight: "600" },
  permBlock: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  permBtn: { backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  permBtnText: { ...morphFont, fontWeight: "700", color: "#080808" },
  error: { ...morphFont, color: "#F87171", textAlign: "center", marginHorizontal: 20, fontSize: fontSize(13) },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: scale(32), paddingTop: verticalScale(8) },
  sideBtn: {
    width: scale(48),
    height: scale(48),
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainBtn: {
    width: scale(58),
    height: scale(58),
    borderRadius: 29,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  mainInner: { width: scale(18), height: scale(18), borderRadius: 9, borderWidth: 2, borderColor: "#080808" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: "70%" },
  modalTitle: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", marginBottom: 12 },
  histRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E8E8EB" },
  histTitle: { ...morphFont, fontWeight: "600", color: "#111" },
  histMeta: { ...morphFont, color: "#71717A", fontSize: fontSize(12) },
  link: { ...morphFont, textAlign: "center", marginTop: 12, color: "#71717A", fontWeight: "600" },
});