import { Ionicons } from "@expo/vector-icons";
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

function WaveIcon() {
  return (
    <View style={styles.wave}>
      <View style={[styles.bar, { height: 7 }]} />
      <View style={[styles.bar, { height: 13 }]} />
      <View style={[styles.bar, { height: 9 }]} />
      <View style={[styles.bar, { height: 15 }]} />
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
  const canSend = !disabled && !sending && value.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onCamera}
        disabled={!onCamera || disabled}
        style={({ pressed }) => [styles.cameraBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={cameraA11y}
      >
        <Ionicons name="camera-outline" size={22} color="#111111" />
      </Pressable>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#B0B0B4"
        multiline
        maxLength={600}
        editable={!disabled && !sending}
        returnKeyType="send"
        blurOnSubmit={false}
        onSubmitEditing={() => {
          if (canSend) onSend();
        }}
        accessibilityLabel={placeholder}
      />
      <Pressable
        onPress={onSend}
        disabled={Boolean(disabled || sending)}
        style={styles.sendBtn}
        accessibilityRole="button"
        accessibilityLabel={sendA11y}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <WaveIcon />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 58,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cameraBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111111",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7B4DFF",
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2.5,
  },
  bar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
});
