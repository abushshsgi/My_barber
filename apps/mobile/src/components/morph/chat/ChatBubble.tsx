import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { ChatMarkdown } from "./ChatMarkdown";

export type ChatRole = "user" | "assistant";

type Props = {
  role: ChatRole;
  content: string;
  pending?: boolean;
  streaming?: boolean;
};

function Dot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.28);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 280 }), withTiming(0.28, { duration: 280 })),
        -1,
        false,
      ),
    );
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

function TypingDots() {
  return (
    <View style={styles.dots} accessibilityLabel="typing">
      <Dot delay={0} />
      <Dot delay={140} />
      <Dot delay={280} />
    </View>
  );
}

export function ChatBubble({ role, content, pending, streaming }: Props) {
  const isUser = role === "user";

  if (pending && !content && !isUser) {
    return (
      <Animated.View entering={FadeIn.duration(180)} style={styles.assistantRow}>
        <TypingDots />
      </Animated.View>
    );
  }

  if (isUser) {
    return (
      <Animated.View entering={FadeInDown.duration(220)} style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{content}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.assistantRow}>
      <ChatMarkdown content={streaming ? `${content}▍` : content} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  userBubble: {
    maxWidth: "78%",
    backgroundColor: "#F4F4F5",
    borderRadius: 16,
    borderBottomRightRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#111111",
  },
  assistantRow: {
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#A1A1AA",
  },
});
