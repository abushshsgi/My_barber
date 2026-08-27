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
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { morphFont } from "../../../theme/morph-font";

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
  const { theme } = useMorphAppearance();
  const isDark = theme === "dark";

  return (
    <View
      style={[
        styles.typingWrap,
        isDark ? styles.typingDark : styles.typingLight,
      ]}
      accessibilityLabel="typing"
    >
      <View style={styles.typingIcon}>
        <Ionicons name="sparkles" size={12} color="#8B5CF6" />
      </View>
      <View style={styles.dots}>
        <Dot delay={0} />
        <Dot delay={140} />
        <Dot delay={280} />
      </View>
    </View>
  );
}

export function ChatBubble({ role, content, pending }: Props) {
  const isUser = role === "user";
  const { colors: pal, chatFs, theme } = useMorphAppearance();
  const isDark = theme === "dark";
  const textSize = chatFs(14);
  const line = chatFs(20);

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
        <View
          style={[
            styles.userBubble,
            isDark ? styles.userBubbleDark : styles.userBubbleLight,
          ]}
        >
          <Text style={[styles.userText, { color: pal.fg, fontSize: textSize, lineHeight: line }]}>
            {content}
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.assistantRow}>
      <ChatMarkdown content={content} color={pal.fg} scale={textSize / 13} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignItems: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  userBubble: {
    maxWidth: "82%",
    borderRadius: 22,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubbleLight: {
    backgroundColor: "#F4F4F6",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  userBubbleDark: {
    backgroundColor: "rgba(255, 255, 255, 0.09)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  userText: {
    ...morphFont,
    fontSize: 14,
    lineHeight: 20,
    color: "#111111",
  },
  assistantRow: {
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  typingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  typingLight: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  typingDark: {
    backgroundColor: "rgba(24, 24, 27, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  typingIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#A78BFA",
  },
});
