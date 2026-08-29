import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";

import { morphFont } from "../../../theme/morph-font";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import {
  IS_SMALL_DEVICE,
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onCamera?: () => void;
  onVoice?: () => void;
  voiceEnabled?: boolean;
  voiceState?: "idle" | "recording" | "busy";
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  sendA11y?: string;
  cameraA11y?: string;
  voiceA11y?: string;
};

function WaveIcon() {
  return (
    <View style={styles.wave}>
      <View style={[styles.bar, { height: 5 }]} />
      <View style={[styles.bar, { height: 10 }]} />
      <View style={[styles.bar, { height: 7 }]} />
      <View style={[styles.bar, { height: 12 }]} />
    </View>
  );
}

function MicPulse({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, reduced]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.35 - pulse.value * 0.28,
    transform: [{ scale: 1 + pulse.value * 0.38 }],
  }));

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.micRing, ring]} />
      {children}
    </View>
  );
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  onCamera,
  onVoice,
  voiceEnabled = false,
  voiceState = "idle",
  disabled,
  sending,
  placeholder = "Savolingizni yozing…",
  sendA11y = "Yuborish",
  cameraA11y = "Kamera",
  voiceA11y = "Mikrofon",
}: Props) {
  const { colors: pal, chatFs } = useMorphAppearance();
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;
  const canSend = !disabled && !sending && hasText;
  const voiceBusy = voiceState === "busy";
  const voiceRecording = voiceState === "recording";

  return (
    <Animated.View
      layout={LinearTransition.duration(180).easing(Easing.out(Easing.cubic))}
      style={[
        styles.wrap,
        {
          backgroundColor: "#FFFFFF",
          borderColor: focused ? "#111111" : "rgba(17,17,17,0.12)",
          shadowColor: "#111111",
          shadowOpacity: focused ? 0.12 : 0.04,
          shadowRadius: focused ? 10 : 4,
          shadowOffset: { width: 0, height: 2 },
        },
      ]}
    >
      <Pressable
        onPress={onCamera}
        disabled={!onCamera || disabled}
        style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={cameraA11y}
      >
        <Ionicons name="add" size={22} color={pal.fg} />
      </Pressable>
      <TextInput
        style={[styles.input, { color: pal.fg, fontSize: chatFs(16), lineHeight: chatFs(22) }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={pal.muted}
        multiline
        maxLength={600}
        editable={!disabled && !sending}
        returnKeyType="send"
        blurOnSubmit={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => {
          if (canSend) onSend();
        }}
        accessibilityLabel={placeholder}
        {...(Platform.OS === "web" ? { rows: 1 } : {})}
      />
      {hasText || sending ? (
        <Animated.View
          entering={ZoomIn.duration(160).easing(Easing.out(Easing.cubic))}
          exiting={ZoomOut.duration(120)}
        >
          <Pressable
            onPress={onSend}
            disabled={!canSend && !sending}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: pal.fg },
              !canSend && !sending && { backgroundColor: pal.track },
              pressed && canSend && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={sendA11y}
          >
            {sending ? (
              <ActivityIndicator size="small" color={pal.bg} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={pal.bg} />
            )}
          </Pressable>
        </Animated.View>
      ) : voiceEnabled ? (
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(100)}
        >
          <MicPulse>
            <Pressable
              onPress={onVoice}
              disabled={!onVoice || disabled || voiceBusy}
              style={({ pressed }) => [
                styles.voiceBtn,
                voiceRecording && styles.voiceBtnLive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={voiceA11y}
              accessibilityState={{ busy: voiceBusy, selected: voiceRecording }}
            >
              {voiceBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name={voiceRecording ? "stop" : "mic"} size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </MicPulse>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(100)}
          style={styles.voiceBtn}
          importantForAccessibility="no-hide-descendants"
        >
          <WaveIcon />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const BAR_HEIGHT = verticalScale(IS_SMALL_DEVICE ? 46 : 52);
const SIDE_BTN = scale(IS_SMALL_DEVICE ? 34 : 38);
const ACTION_BTN = scale(IS_SMALL_DEVICE ? 32 : 36);
const MIC_RING = ACTION_BTN + scale(10);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: BAR_HEIGHT,
    paddingLeft: moderateScale(6),
    paddingRight: moderateScale(6),
    paddingVertical: moderateScale(6),
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.14)",
  },
  wrapFocused: {
    borderColor: "rgba(255,255,255,0.28)",
  },
  sideBtn: {
    width: SIDE_BTN,
    height: SIDE_BTN,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SIDE_BTN / 2,
  },
  pressed: {
    opacity: 0.78,
  },
  input: {
    flex: 1,
    minHeight: verticalScale(28),
    /** Klaviatura ochilganda kontent tashqariga chiqmasligi uchun cheklangan. */
    maxHeight: verticalScale(IS_SMALL_DEVICE ? 72 : 96),
    paddingHorizontal: scale(8),
    paddingVertical: moderateScale(6),
    ...morphFont,
    fontSize: fontSize(16),
    lineHeight: fontSize(22),
    color: "#111111",
    textAlign: "left",
  },
  sendBtn: {
    width: ACTION_BTN,
    height: ACTION_BTN,
    borderRadius: ACTION_BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  sendBtnIdle: {
    backgroundColor: "#D4D4D8",
  },
  voiceBtn: {
    width: ACTION_BTN,
    height: ACTION_BTN,
    borderRadius: ACTION_BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  voiceBtnLive: {
    backgroundColor: "#FF3B30",
  },
  micRing: {
    position: "absolute",
    top: -scale(5),
    left: -scale(5),
    width: MIC_RING,
    height: MIC_RING,
    borderRadius: MIC_RING / 2,
    borderWidth: 1.5,
    borderColor: "#111111",
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(1.5),
  },
  bar: {
    width: scale(2),
    borderRadius: moderateScale(2),
    backgroundColor: "#FFFFFF",
  },
});
