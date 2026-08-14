import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

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

function WaveIcon({ color = "#FFFFFF" }: { color?: string }) {
  return (
    <View style={styles.wave}>
      <View style={[styles.bar, { height: 6, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 11, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 8, backgroundColor: color }]} />
      <View style={[styles.bar, { height: 13, backgroundColor: color }]} />
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
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Pressable
        onPress={onCamera}
        disabled={!onCamera || disabled}
        style={({ pressed }) => [styles.sideBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={cameraA11y}
      >
        <Ionicons name="camera-outline" size={20} color="#3F3A5A" />
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
      />
      {hasText || sending ? (
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
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          )}
        </Pressable>
      ) : (
        <View style={styles.voiceBtn} importantForAccessibility="no-hide-descendants">
          <WaveIcon />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 52,
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.08)",
    shadowColor: "#5B21B6",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  wrapFocused: {
    borderColor: "rgba(124, 58, 237, 0.28)",
    shadowOpacity: 0.12,
  },
  sideBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.78,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    paddingHorizontal: 6,
    paddingVertical: 8,
    fontSize: 16,
    lineHeight: 22,
    color: "#1E1B4B",
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E1B4B",
    marginBottom: 0,
  },
  sendBtnIdle: {
    backgroundColor: "#C4B5FD",
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7C3AED",
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  bar: {
    width: 2,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
});
