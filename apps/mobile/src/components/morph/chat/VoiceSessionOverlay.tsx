import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
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
  reply?: string;
  error?: string | null;
  title: string;
  listeningLabel: string;
  listeningHint: string;
  transcribingLabel: string;
  thinkingLabel: string;
  speakingLabel: string;
  yourTurnLabel: string;
  tapToStop: string;
  tapToSend: string;
  interruptLabel: string;
  closeA11y: string;
  onClose: () => void;
  onPrimary: () => void;
};

const BAR_COUNT = 9;

function phaseCopy(
  phase: MorphVoicePhase,
  labels: Pick<
    Props,
    | "listeningLabel"
    | "transcribingLabel"
    | "thinkingLabel"
    | "speakingLabel"
    | "yourTurnLabel"
  >,
): string {
  if (phase === "recording") return labels.listeningLabel;
  if (phase === "transcribing") return labels.transcribingLabel;
  if (phase === "thinking") return labels.thinkingLabel;
  if (phase === "speaking") return labels.speakingLabel;
  if (phase === "waiting") return labels.yourTurnLabel;
  return labels.listeningLabel;
}

function WaveBar({
  index,
  level,
  live,
  reduced,
}: {
  index: number;
  level: number;
  live: boolean;
  reduced: boolean;
}) {
  const wave = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      wave.value = 0.35;
      return;
    }
    wave.value = withRepeat(
      withTiming(1, {
        duration: 420 + index * 70,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [index, reduced, wave]);

  const style = useAnimatedStyle(() => {
    const base = interpolate(wave.value, [0, 1], [0.22, 0.7]);
    const amp = live ? Math.max(base, 0.28 + level * 0.72) : base * 0.55;
    const mid = Math.abs(index - (BAR_COUNT - 1) / 2);
    const falloff = 1 - mid * 0.08;
    return {
      height: 10 + amp * 42 * falloff,
      opacity: live ? 0.95 : 0.55,
    };
  }, [level, live]);

  return <Animated.View style={[styles.bar, style]} />;
}

export function VoiceSessionOverlay({
  visible,
  phase,
  metering,
  transcript,
  reply,
  error,
  title,
  listeningLabel,
  listeningHint,
  transcribingLabel,
  thinkingLabel,
  speakingLabel,
  yourTurnLabel,
  tapToStop,
  tapToSend,
  interruptLabel,
  closeA11y,
  onClose,
  onPrimary,
}: Props) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);
  const listening = phase === "recording";
  const speaking = phase === "speaking";
  const busy = phase === "transcribing" || phase === "thinking";
  const level = Math.max(0, Math.min(1, (metering + 55) / 42));

  useEffect(() => {
    if (reduced) {
      pulse.value = 0.4;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: listening ? 900 : 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [listening, pulse, reduced]);

  const ringA = useAnimatedStyle(() => {
    const extra = listening ? level * 0.18 : 0;
    return {
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.22]) + extra }],
      opacity: interpolate(pulse.value, [0, 1], [0.28, 0.08]),
    };
  }, [level, listening]);

  const ringB = useAnimatedStyle(() => {
    const extra = listening ? level * 0.12 : 0;
    return {
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.38]) + extra }],
      opacity: interpolate(pulse.value, [0, 1], [0.18, 0.04]),
    };
  }, [level, listening]);

  const orbStyle = useAnimatedStyle(() => {
    const extra = listening ? level * 0.08 : interpolate(pulse.value, [0, 1], [0, 0.04]);
    return { transform: [{ scale: 1 + extra }] };
  }, [level, listening]);

  if (!visible) return null;

  const status = phaseCopy(phase, {
    listeningLabel,
    transcribingLabel,
    thinkingLabel,
    speakingLabel,
    yourTurnLabel,
  });
  const hint = listening ? listeningHint : speaking ? interruptLabel : tapToStop;
  const caption = listening ? null : speaking || busy ? reply || transcript : transcript;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 }]}>
      <View style={styles.top}>
        <View style={styles.livePill}>
          <View style={[styles.liveDot, listening && styles.liveDotOn]} />
          <Text style={styles.brand}>{title}</Text>
        </View>
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

      <Pressable
        style={styles.stage}
        onPress={onPrimary}
        accessibilityRole="button"
        accessibilityLabel={listening ? tapToSend : hint}
      >
        <Animated.View style={[styles.ring, styles.ringOuter, ringB]} />
        <Animated.View style={[styles.ring, ringA]} />
        <Animated.View
          style={[
            styles.orb,
            listening && styles.orbLive,
            speaking && styles.orbSpeak,
            orbStyle,
          ]}
        >
          <View style={styles.waveRow}>
            {Array.from({ length: BAR_COUNT }, (_, i) => (
              <WaveBar
                key={i}
                index={i}
                level={listening ? level : speaking ? 0.55 : 0.2}
                live={listening || speaking}
                reduced={Boolean(reduced)}
              />
            ))}
          </View>
        </Animated.View>

        <Text style={styles.status}>{status}</Text>
        {listening ? (
          <Text style={styles.hintStrong}>{listeningHint}</Text>
        ) : caption ? (
          <Text style={styles.transcript} numberOfLines={4}>
            {caption}
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.hint}>{listening ? tapToSend : hint}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0B0B0D",
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    minHeight: 44,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  liveDotOn: {
    backgroundColor: "#34C759",
  },
  brand: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  ring: {
    position: "absolute",
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 1.5,
    borderColor: "rgba(52, 199, 89, 0.35)",
  },
  ringOuter: {
    width: 236,
    height: 236,
    borderRadius: 118,
    borderColor: "rgba(52, 199, 89, 0.18)",
  },
  orb: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "#1C1C1E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  orbLive: {
    backgroundColor: "#14532D",
    borderColor: "#34C759",
  },
  orbSpeak: {
    backgroundColor: "#1C1C1E",
    borderColor: "rgba(255,255,255,0.28)",
  },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    gap: 4,
  },
  bar: {
    width: 5,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  status: {
    marginTop: 36,
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  hintStrong: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.62)",
    textAlign: "center",
    maxWidth: 300,
  },
  transcript: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    maxWidth: 340,
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
    color: "rgba(255,255,255,0.38)",
  },
  pressed: {
    opacity: 0.72,
  },
});
