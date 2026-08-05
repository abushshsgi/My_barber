import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";

type Props = {
  locationLabel?: string;
  onPressLocation?: () => void;
  onPressMap?: () => void;
};

/** Logo + joylashuv pill + xarita — rasmdagi header. */
export function HomeHeader({
  locationLabel = "O'zbekiston",
  onPressLocation,
  onPressMap,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.logo} accessibilityRole="header">
          Mysaloon
          <Text style={styles.dot}>.</Text>
        </Text>
        <Pressable
          onPress={onPressLocation}
          style={styles.locationPill}
          accessibilityRole="button"
          accessibilityLabel="Hudud"
        >
          <Ionicons name="location-sharp" size={14} color={colors.muted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={onPressMap}
        hitSlop={8}
        style={styles.mapBtn}
        accessibilityRole="button"
        accessibilityLabel="Xarita"
      >
        <Ionicons name="map-outline" size={22} color={colors.fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  logo: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.fg,
    letterSpacing: -0.4,
  },
  dot: {
    color: colors.brandDot,
  },
  locationPill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: "58%",
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.fg,
  },
  mapBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
