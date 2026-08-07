import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { colors } from "../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "BookingSuccess">;

export function BookingSuccessScreen({ route, navigation }: Props) {
  const { salonName, whenLabel } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={64} color={colors.fg} />
      </View>
      <Text style={styles.title}>Bron tayyor!</Text>
      <Text style={styles.sub}>
        {salonName}
        {"\n"}
        {whenLabel}
      </Text>

      <Pressable
        style={styles.primary}
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: "MainTabs", params: { screen: "Profile" } }],
          })
        }
      >
        <Text style={styles.primaryText}>Buyurtmalarga o'tish</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => navigation.popToTop()}>
        <Text style={styles.secondaryText}>Bosh sahifa</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
    fontWeight: "600",
  },
  primary: {
    marginTop: 36,
    alignSelf: "stretch",
    backgroundColor: colors.fg,
    borderRadius: 16,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#FFF", fontWeight: "800", fontSize: 15 },
  secondary: {
    marginTop: 12,
    alignSelf: "stretch",
    borderRadius: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.fg, fontWeight: "700", fontSize: 14 },
});
