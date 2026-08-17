import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MorphVoicePhase } from "../../../hooks/useMorphVoice";

type Props = {
  visible: boolean;
  phase: MorphVoicePhase;
  metering: number;
  transcript?: string;
  error?: string | null;
  title: string;
  listeningLabel: string;
  transcribingLabel: string;
  thinkingLabel: string;
  speakingLabel: string;
  tapToStop: string;
  closeA11y: string;
  onClose: () => void;
  onPrimary: () => void;
};

function phaseCopy(
  phase: MorphVoicePhase,
  labels: Pick<
    Props,
    "listeningLabel" | "transcribingLabel" | "thinkingLabel" | "speakingLabel"
  >,
): string {
  if (phase === "recording") return labels.listeningLabel;
  if (phase === "transcribing") return labels.transcribingLabel;
  if (phase === "thinking") return labels.thinkingLabel;
  if (phase === "speaking") return labels.speakingLabel;
  return labels.listeningLabel;
}

export function VoiceSessionOverlay({
  visible,
  phase,
  metering,
  transcript,
  error,
  title,
  listeningLabel,
  transcribingLabel,
  thinkingLabel,
  speakingLabel,
  tapToStop,
  closeA11y,
  onClose,
  onPrimary,
}: Props) {
  const insets = useSafeAreaInsets();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  const level = Math.max(0, Math.min(1, (metering + 50) / 40));
  const orbStyle = useAnimatedStyle(() => {
    const extra = phase === "recording" ? level * 18 : interpolate(pulse.value, [0, 1], [0, 10]);
    return {
      transform: [{ scale: 1 + extra / 90 }],
      opacity: phase === "idle" ? 0.7 : 1,
    };
  }, [level, phase]);

  if (!visible) return null;

  const status = phaseCopy(phase, {
    listeningLabel,
    transcribingLabel,
    thinkingLabel,
    speakingLabel,
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.top}>
        <Text style={styles.brand}>{title}</Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={closeA11y}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <Pressable style={styles.stage} onPress={onPrimary} accessibilityRole="button">
        <Animated.View style={[styles.glow, orbStyle]} />
        <View style={[styles.orb, phase === "recording" && styles.orbLive]}>
          <Ionicons
            name={phase === "speaking" ? "volume-high" : phase === "thinking" ? "sparkles" : "mic"}
            size={36}
            color="#FFFFFF"
          />
        </View>
        <Text style={styles.status}>{status}</Text>
        {transcript && phase !== "recording" ? (
          <Text style={styles.transcript} numberOfLines={3}>
            {transcript}
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.hint}>{tapToStop}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000000",
    zIndex: 40,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    minHeight: 44,
  },
  brand: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(10, 132, 255, 0.18)",
  },
  orb: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3A3A3C",
  },
  orbLive: {
    backgroundColor: "#0A84FF",
    borderColor: "#0A84FF",
  },
  status: {
    marginTop: 28,
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  transcript: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#8E8E93",
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: "#FF453A",
    textAlign: "center",
  },
  hint: {
    marginTop: 28,
    fontSize: 13,
    color: "#636366",
  },
  pressed: {
    opacity: 0.72,
  },
});
