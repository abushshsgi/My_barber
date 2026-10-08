import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useShellTheme } from "../../lib/useShellTheme";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

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
  const pal = useShellTheme();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.logo, { color: pal.fg }]} accessibilityRole="header">
          Mysaloon
          <Text style={[styles.dot, { color: pal.fg }]}>.</Text>
        </Text>
        <Pressable
          onPress={onPressLocation}
          style={[styles.locationPill, { backgroundColor: pal.card }]}
          accessibilityRole="button"
          accessibilityLabel="Hudud"
        >
          <Ionicons name="location-sharp" size={14} color={pal.muted} />
          <Text style={[styles.locationText, { color: pal.fg }]} numberOfLines={1}>
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
        <Ionicons name="map-outline" size={22} color={pal.fg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    gap: moderateScale(12),
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(8),
    minWidth: 0,
  },
  logo: {
    fontSize: fontSize(17),
    fontWeight: "800",
    color: "#111111",
    letterSpacing: -0.3,
  },
  dot: {
    color: "#111111",
  },
  locationPill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(6),
    maxWidth: "58%",
  },
  locationText: {
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "#111111",
  },
  mapBtn: {
    width: scale(34),
    height: scale(34),
    alignItems: "center",
    justifyContent: "center",
  },
});
