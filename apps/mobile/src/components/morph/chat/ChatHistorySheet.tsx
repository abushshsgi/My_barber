import { Ionicons } from "@expo/vector-icons";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MorphChatThread } from "../../../hooks/useMorphChat";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Props = {
  visible: boolean;
  threads: MorphChatThread[];
  activeThreadId: string | null;
  title: string;
  emptyLabel: string;
  newChatLabel: string;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function previewOf(thread: MorphChatThread): string {
  const last = [...thread.messages].reverse().find((m) => m.id !== "welcome");
  return (last?.content || "").trim().slice(0, 80) || "—";
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ChatHistorySheet({
  visible,
  threads,
  activeThreadId,
  title,
  emptyLabel,
  newChatLabel,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
              <Ionicons name="close" size={22} color="#3F3F46" />
            </Pressable>
          </View>

          <Pressable
            style={styles.newBtn}
            onPress={onNewChat}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.newBtnText}>{newChatLabel}</Text>
          </Pressable>

          <FlatList
            data={threads}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.empty}>{emptyLabel}</Text>
            }
            renderItem={({ item }) => {
              const active = item.id === activeThreadId;
              return (
                <Pressable
                  style={[styles.row, active && styles.rowActive]}
                  onPress={() => onSelect(item.id)}
                >
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.rowPreview} numberOfLines={1}>
                      {previewOf(item)}
                    </Text>
                    <Text style={styles.rowMeta}>{formatWhen(item.updatedAt)}</Text>
                  </View>
                  <Pressable
                    onPress={() => onDelete(item.id)}
                    hitSlop={8}
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={16} color="#A1A1AA" />
                  </Pressable>
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: "#FAFAFA",
    borderTopLeftRadius: moderateScale(22),
    borderTopRightRadius: moderateScale(22),
    paddingTop: verticalScale(10),
    paddingHorizontal: scale(16),
  },
  handle: {
    alignSelf: "center",
    width: scale(40),
    height: verticalScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: "#E5E5E5",
    marginBottom: verticalScale(12),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(14),
  },
  title: {
    fontSize: fontSize(17),
    fontWeight: "700",
    color: "#111111",
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    alignSelf: "flex-start",
    backgroundColor: "#111111",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(14),
    marginBottom: verticalScale(12),
  },
  newBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: fontSize(14),
  },
  list: {
    paddingBottom: verticalScale(8),
    flexGrow: 1,
  },
  empty: {
    textAlign: "center",
    color: "#737373",
    paddingVertical: verticalScale(28),
    fontSize: fontSize(14),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: moderateScale(14),
    marginBottom: verticalScale(8),
    backgroundColor: "#FFFFFF",
  },
  rowActive: {
    backgroundColor: "#F0F0F0",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: fontSize(14),
    fontWeight: "700",
    color: "#111111",
  },
  rowPreview: {
    marginTop: verticalScale(3),
    fontSize: fontSize(12),
    color: "#737373",
  },
  rowMeta: {
    marginTop: verticalScale(4),
    fontSize: fontSize(11),
    color: "#737373",
  },
  deleteBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
});
