import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HomeListing } from "../../api/types";
import { shortPrice } from "../../lib/price";
import { colors } from "../../theme/colors";

const CARD_WIDTH = 280;

type Props = {
  item: HomeListing;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  favorited?: boolean;
};

/** Salon / usta kartasi — rasm + meta + narx. */
export function ListingCard({ item, onPress, onToggleFavorite, favorited }: Props) {
  const meta = [
    item.categoryLabel,
    item.distanceKm > 0 ? `${item.distanceKm.toFixed(1)} km` : "",
    item.address,
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" · ");

  const price = shortPrice(item.priceFrom);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.media}>
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={180}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
        )}
        <Pressable
          onPress={onToggleFavorite}
          style={styles.heart}
          hitSlop={6}
          accessibilityLabel="Sevimli"
        >
          <Ionicons
            name={favorited ? "heart" : "heart-outline"}
            size={16}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : (
          <View style={styles.metaSpacer} />
        )}
        {price ? (
          <Text style={styles.price}>
            {price} <Text style={styles.priceSuffix}>dan</Text>
          </Text>
        ) : (
          <View style={styles.priceSpacer} />
        )}
      </View>
    </Pressable>
  );
}

export const LISTING_CARD_WIDTH = CARD_WIDTH;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.bg,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  media: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: colors.surface,
  },
  placeholder: {
    backgroundColor: colors.surface,
  },
  heart: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.heartOverlay,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    minHeight: 72,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  metaSpacer: {
    marginTop: 2,
    height: 16,
  },
  price: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: colors.fg,
  },
  priceSuffix: {
    fontWeight: "700",
    color: colors.fg,
  },
  priceSpacer: {
    marginTop: 6,
    height: 18,
  },
});
