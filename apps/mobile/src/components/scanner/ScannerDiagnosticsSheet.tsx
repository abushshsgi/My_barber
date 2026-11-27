import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatScannerDiagnostics, type ScannerDiagnosticSnapshot } from "@mybarber/scanner";
import { morphFont } from "../../theme/morph-font";
import { fontSize, verticalScale } from "../../utils/responsive";

type Props = {
  visible: boolean;
  snapshot: ScannerDiagnosticSnapshot;
  onClose: () => void;
};

/** Development-only copyable scanner report. No tokens or full barcodes. */
export function ScannerDiagnosticsSheet({ visible, snapshot, onClose }: Props) {
  const text = formatScannerDiagnostics(snapshot);
  const [copied, setCopied] = useState(false);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Diagnostika</Text>
          <ScrollView style={{ maxHeight: verticalScale(360) }}>
            <Text selectable style={styles.body}>
              {text}
            </Text>
          </ScrollView>
          <Pressable
            style={styles.copyBtn}
            onPress={() => {
              void Clipboard.setStringAsync(text).then(() => {
                setCopied(true);
              });
            }}
          >
            <Text style={styles.copyText}>{copied ? "Nusxa olindi" : "Nusxa olish"}</Text>
          </Pressable>
          <Pressable onPress={onClose}>
            <Text style={styles.link}>Yopish</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", marginBottom: 12, color: "#111" },
  body: { ...morphFont, color: "#111", fontSize: fontSize(12), lineHeight: fontSize(18) },
  copyBtn: {
    backgroundColor: "#111",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 12,
  },
  copyText: { ...morphFont, color: "#fff", fontWeight: "700" },
  link: { ...morphFont, textAlign: "center", marginTop: 12, color: "#71717A", fontWeight: "600" },
});
