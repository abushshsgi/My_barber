import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchSubscriptionPaymentStatus } from "../../api/subscriptions";
import { isPaymeAppReturnUrl, PAYME_RETURN_INTERCEPT } from "../../lib/payme-checkout";
import { colors } from "../../theme/colors";
import { fontSize, scale, verticalScale } from "../../utils/responsive";

const isWeb = Platform.OS === "web";

function openPaymePage(uri: string) {
  if (typeof window !== "undefined") {
    const popup = window.open(uri, "_blank", "noopener,noreferrer");
    if (popup) return;
  }
  void Linking.openURL(uri);
}

type Props = {
  visible: boolean;
  checkoutUrl: string | null;
  orderId: string | null;
  onClose: () => void;
  onPaid: () => void;
  /** «Вернуться в приложение» — Payme bosh sahifasi emas, ilovaning o'zi. */
  onReturnToApp: () => void;
};

/**
 * Telefon: Payme sahifasi WebView ichida.
 * Brauzer: react-native-webview ishlamaydi, jonli Payme esa iframe ni bloklaydi,
 * shuning uchun checkout yangi oynada ochiladi va holat shu yerda so'raladi.
 */
export function PaymeCheckoutView({
  visible,
  checkoutUrl,
  orderId,
  onClose,
  onPaid,
  onReturnToApp,
}: Props) {
  const [status, setStatus] = useState("pending");
  const paidRef = useRef(false);
  const returnedRef = useRef(false);

  const leavePayme = () => {
    if (returnedRef.current) return;
    returnedRef.current = true;
    onReturnToApp();
  };

  useEffect(() => {
    paidRef.current = false;
    returnedRef.current = false;
    setStatus("pending");
  }, [orderId, visible]);

  useEffect(() => {
    if (!isWeb || !visible || !checkoutUrl) return;
    openPaymePage(checkoutUrl);
  }, [visible, checkoutUrl]);

  useEffect(() => {
    if (!visible || !orderId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const row = await fetchSubscriptionPaymentStatus(orderId);
        if (cancelled) return;
        setStatus(row.sync_error && row.status === "pending" ? row.sync_error : row.status);
        if (row.status === "paid" && !paidRef.current) {
          paidRef.current = true;
          onPaid();
        }
      } catch {
        /* keyingi so'rov */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [visible, orderId, onPaid]);

  if (!visible || !checkoutUrl) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Yopish</Text>
          </Pressable>
          <Text style={styles.powered}>Powered by Payme</Text>
        </View>
        {isWeb ? (
          <View style={styles.webBody}>
            <Text style={styles.webTitle}>To'lov Payme sahifasida</Text>
            <Text style={styles.webLead}>
              Karta shu yerda kiritilmaydi. Payme sahifasida to'lang va shu oynaga qayting — obuna o'zi yoqiladi.
            </Text>
            <Pressable onPress={() => openPaymePage(checkoutUrl)} style={styles.webBtn}>
              <Text style={styles.webBtnText}>Payme da ochish</Text>
            </Pressable>
            <ActivityIndicator color={colors.fg} style={styles.webSpin} />
          </View>
        ) : (
          <WebView
            source={{ uri: checkoutUrl }}
            style={styles.frame}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={colors.fg} />
              </View>
            )}
            originWhitelist={["https://*", "mysaloon://*"]}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            injectedJavaScript={PAYME_RETURN_INTERCEPT}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data) as { type?: string };
                if (data.type === "payme-return") leavePayme();
              } catch {
                /* Payme o'z xabari */
              }
            }}
            onShouldStartLoadWithRequest={(request) => {
              if (!isPaymeAppReturnUrl(request.url)) return true;
              leavePayme();
              return false;
            }}
            onNavigationStateChange={(nav) => {
              if (nav.url && isPaymeAppReturnUrl(nav.url)) leavePayme();
            }}
          />
        )}
        {status !== "pending" && status !== "paid" ? (
          <Text style={styles.note}>Holat: {status}</Text>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  close: { fontSize: fontSize(15), fontWeight: "700", color: colors.fg },
  powered: { fontSize: fontSize(11), fontWeight: "700", color: "#00CCCC" },
  frame: { flex: 1, backgroundColor: "#fff" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  webBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(28),
    gap: verticalScale(12),
  },
  webTitle: {
    fontSize: fontSize(20),
    fontWeight: "800",
    color: colors.fg,
    textAlign: "center",
  },
  webLead: {
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    fontWeight: "500",
    color: colors.muted,
    textAlign: "center",
  },
  webBtn: {
    marginTop: verticalScale(8),
    minHeight: verticalScale(48),
    paddingHorizontal: scale(22),
    borderRadius: 999,
    backgroundColor: "#00CCCC",
    alignItems: "center",
    justifyContent: "center",
  },
  webBtnText: { fontSize: fontSize(15), fontWeight: "800", color: "#041414" },
  webSpin: { marginTop: verticalScale(8) },
  note: {
    padding: scale(12),
    fontSize: fontSize(13),
    fontWeight: "600",
    color: colors.muted,
  },
});
