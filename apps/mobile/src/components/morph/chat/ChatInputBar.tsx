import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
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
  disabled?: boolean;
  sending?: boolean;
  placeholder?: string;
  sendA11y?: string;
  cameraA11y?: string;
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
  disabled,
  sending,
  placeholder = "Savolingizni yozing…",
  sendA11y = "Yuborish",
  cameraA11y = "Kamera",
}: Props) {
  const [focused, setFocused] = useState(false);
  const hasText = value.trim().length > 0;
  const canSend = !disabled && !sending && hasText;

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
        style={[styles.input, !hasText && styles.inputCentered]}
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
    minHeight: 44,
    paddingLeft: 6,
    paddingRight: 5,
    paddingVertical: 4,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEF2",
    shadowColor: "#1E1B4B",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  wrapFocused: {
    borderColor: "#DDD6FE",
    shadowOpacity: 0.1,
  },
  sideBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.78,
  },
  input: {
    flex: 1,
    minHeight: 32,
    maxHeight: 88,
    paddingHorizontal: 4,
    paddingVertical: 6,
    fontSize: 15,
    lineHeight: 20,
    color: "#1E1B4B",
    textAlign: "left",
  },
  inputCentered: {
    textAlign: "center",
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E1B4B",
  },
  sendBtnIdle: {
    backgroundColor: "#C4B5FD",
  },
  voiceBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
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
