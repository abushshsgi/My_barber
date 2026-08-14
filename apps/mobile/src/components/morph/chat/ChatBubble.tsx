import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type ChatRole = "user" | "assistant";

type Props = {
  role: ChatRole;
  content: string;
  pending?: boolean;
};

export function ChatBubble({ role, content, pending }: Props) {
  const isUser = role === "user";

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser ? (
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={14} color="#7B4DFF" />
        </View>
      ) : null}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
          {content}
          {pending ? "…" : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowAssistant: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFE8FF",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleUser: {
    backgroundColor: "#111111",
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 6,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  textUser: {
    color: "#FFFFFF",
  },
  textAssistant: {
    color: "#1F1F1F",
  },
});
