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
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.7)" />
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
                    <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "78%",
    backgroundColor: "#121212",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 12,
  },
  newBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  list: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  empty: {
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    paddingVertical: 28,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.06)",
  },
  rowActive: {
    borderColor: "rgba(139, 92, 246, 0.45)",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rowPreview: {
    marginTop: 3,
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
