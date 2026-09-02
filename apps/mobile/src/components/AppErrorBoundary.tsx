import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Release APK da JS xato qizil ekran o‘rniga ilovani o‘chirib yubormasin. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Ilova ochilmadi</Text>
        <Text style={styles.body}>{this.state.error.message}</Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Qayta urinish</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.bg,
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.fg },
  body: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  btn: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.fg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: { color: colors.bg, fontWeight: "600" },
});
