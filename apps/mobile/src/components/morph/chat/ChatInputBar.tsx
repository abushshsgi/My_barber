import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
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
  const { chatFs } = useMorphAppearance();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;
  const canSend = !disabled && !sending && hasText;
  const voiceBusy = voiceState === "busy";
  const voiceRecording = voiceState === "recording";

  const breathe = useSharedValue(0);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      breathe.value = 0;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [breathe, reduced]);

  useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [focusAnim, focused]);

  const wrapAnim = useAnimatedStyle(() => {
    const breatheScale = focused ? 1 : 1 + breathe.value * 0.008;
    const focusScale = 1 + focusAnim.value * 0.012;
    return {
      transform: [{ scale: breatheScale * focusScale }],
      borderColor: focused ? "#000000" : "#111111",
      borderWidth: interpolate(focusAnim.value, [0, 1], [2, 2.5]),
      shadowOpacity: interpolate(focusAnim.value, [0, 1], [0.08, 0.22]),
      shadowRadius: interpolate(focusAnim.value, [0, 1], [8, 16]),
    };
  });

  return (
    <Animated.View
      layout={LinearTransition.duration(180).easing(Easing.out(Easing.cubic))}
      style={[styles.wrap, wrapAnim]}
    >
      <Pressable
        onPress={onCamera}
        disabled={!onCamera || disabled}
        style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={cameraA11y}
      >
        <Ionicons name="add" size={22} color="#111111" />
      </Pressable>
      <TextInput
        style={[
          styles.input,
          {
            fontSize: chatFs(16),
            lineHeight: chatFs(22),
            ...(Platform.OS === "android"
              ? {
                  paddingTop: moderateScale(8),
                  paddingBottom: moderateScale(8),
                  textAlignVertical: "center" as const,
                  includeFontPadding: false,
                }
              : null),
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#737373"
        multiline
        maxLength={600}
        editable={!disabled && !sending}
        returnKeyType="send"
        blurOnSubmit={false}
        underlineColorAndroid="transparent"
        importantForAutofill="no"
        autoCorrect
        autoCapitalize="sentences"
        disableFullscreenUI={Platform.OS === "android"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => {
          if (canSend) onSend();
        }}
        accessibilityLabel={placeholder}
        {...(Platform.OS === "web" ? { rows: 1 } : {})}
      />
      {hasText || sending ? (
        <View>
          <Pressable
            onPress={() => {
              if (canSend) onSend();
            }}
            // Web: input blur birinchi clickni yutib yubormasin
            {...(Platform.OS === "web"
              ? {
                  onMouseDown: (e: { preventDefault: () => void }) => {
                    e.preventDefault();
                  },
                }
              : null)}
            disabled={sending || disabled}
            style={({ pressed }) => [
              styles.sendBtn,
              !canSend && !sending && styles.sendBtnIdle,
              pressed && canSend && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={sendA11y}
            accessibilityState={{ disabled: !canSend }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      ) : voiceEnabled ? (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(100)}>
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
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(100)}>
          <Pressable
            disabled
            style={[styles.voiceBtn, styles.voiceBtnBlocked]}
            accessibilityRole="button"
            accessibilityLabel={voiceA11y}
            accessibilityState={{ disabled: true }}
          >
            <Ionicons name="mic" size={18} color="rgba(17,17,17,0.28)" />
          </Pressable>
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
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#111111",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
  voiceBtnBlocked: {
    backgroundColor: "rgba(17,17,17,0.06)",
    opacity: 0.72,
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
});
