import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
        <Ionicons name="sparkles" size={12} color="#111111" />
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
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
    gap: moderateScale(8),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(20),
    alignSelf: "flex-start",
  },
  typingLight: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
  },
  typingDark: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
  },
  typingIcon: {
    width: scale(20),
    height: scale(20),
    borderRadius: moderateScale(10),
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    height: verticalScale(18),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: moderateScale(3),
    backgroundColor: "#111111",
  },
});
