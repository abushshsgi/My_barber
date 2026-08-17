import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  ZoomIn,
  ZoomOut,
} from "react-native-reanimated";

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
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;
  const canSend = !disabled && !sending && hasText;
  const voiceBusy = voiceState === "busy";
  const voiceRecording = voiceState === "recording";

  return (
    <Animated.View
      layout={LinearTransition.duration(180).easing(Easing.out(Easing.cubic))}
      style={[styles.wrap, focused && styles.wrapFocused]}
    >
      <Pressable
        onPress={onCamera}
        disabled={!onCamera || disabled}
        style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={cameraA11y}
      >
        <Ionicons name="camera-outline" size={18} color="#3F3A5A" />
      </Pressable>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9B96B0"
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
              !canSend && !sending && styles.sendBtnIdle,
              pressed && canSend && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={sendA11y}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            )}
          </Pressable>
        </Animated.View>
      ) : voiceEnabled ? (
        <Animated.View
          entering={FadeIn.duration(140)}
          exiting={FadeOut.duration(100)}
        >
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
              <Ionicons name={voiceRecording ? "stop" : "mic"} size={16} color="#FFFFFF" />
            )}
          </Pressable>
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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  wrapFocused: {
    borderColor: "#D4D4D8",
  },
  sideBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  pressed: {
    opacity: 0.78,
  },
  input: {
    flex: 1,
    minHeight: 24,
    maxHeight: 72,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 15,
    lineHeight: 20,
    color: "#111111",
    textAlign: "left",
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  sendBtnIdle: {
    backgroundColor: "#D4D4D8",
  },
  voiceBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },
  voiceBtnLive: {
    backgroundColor: "#FF3B30",
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1.5,
  },
  bar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
});
