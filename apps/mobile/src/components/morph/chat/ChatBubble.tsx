import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
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
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

export type ChatRole = "user" | "assistant";

type Props = {
  role: ChatRole;
  content: string;
  pending?: boolean;
  streaming?: boolean;
};

function TypingDot({ delayMs, color }: { delayMs: number; color: string }) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 340, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 340, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [bounce, delayMs]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(bounce.value, [0, 1], [0.35, 1]),
    transform: [
      { translateY: interpolate(bounce.value, [0, 1], [0, -5]) },
      { scale: interpolate(bounce.value, [0, 1], [0.85, 1.08]) },
    ],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

function TypingDots() {
  const { theme } = useMorphAppearance();
  const isDark = theme === "dark";
  const dotColor = isDark ? "rgba(255,255,255,0.85)" : "rgba(17,17,17,0.55)";

  return (
    <View
      style={[
        styles.typingWrap,
        isDark ? styles.typingDark : styles.typingLight,
      ]}
      accessibilityLabel="typing"
    >
      <TypingDot delayMs={0} color={dotColor} />
      <TypingDot delayMs={140} color={dotColor} />
      <TypingDot delayMs={280} color={dotColor} />
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
          <Text style={[styles.userText, { color: isDark ? "#FFFFFF" : pal.fg, fontSize: textSize, lineHeight: line }]}>
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
    paddingHorizontal: scale(16),
    marginBottom: verticalScale(16),
  },
  userBubble: {
    maxWidth: "82%",
    borderRadius: moderateScale(22),
    borderBottomRightRadius: moderateScale(6),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  userBubbleLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
  },
  userBubbleDark: {
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  userText: {
    ...morphFont,
    fontSize: fontSize(14),
    lineHeight: fontSize(20),
    color: "#111111",
  },
  assistantRow: {
    paddingHorizontal: scale(18),
    marginBottom: verticalScale(18),
  },
  typingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(20),
    alignSelf: "flex-start",
  },
  typingLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
  },
  typingDark: {
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  dot: {
    width: scale(7),
    height: scale(7),
    borderRadius: moderateScale(3.5),
  },
});
