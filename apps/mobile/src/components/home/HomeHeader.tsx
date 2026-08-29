import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
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
    color: colors.fg,
    letterSpacing: -0.3,
  },
  dot: {
    color: colors.brandDot,
  },
  locationPill: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(6),
    maxWidth: "58%",
  },
  locationText: {
    fontSize: fontSize(11),
    fontWeight: "600",
    color: colors.fg,
  },
  mapBtn: {
    width: scale(34),
    height: scale(34),
    alignItems: "center",
    justifyContent: "center",
  },
});
