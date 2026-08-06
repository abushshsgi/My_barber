import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HomeListing } from "../../api/types";
import { shortPrice } from "../../lib/price";
import { CARD_MEDIA_ASPECT, useHomeLayout } from "../../theme/layout";
import { colors } from "../../theme/colors";
import { ResponsiveImage } from "../ResponsiveImage";

type Props = {
  item: HomeListing;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  favorited?: boolean;
  /** Parentdan berilsa snap aniqroq. */
  cardWidth?: number;
  imageWidth?: number;
};

/** Salon / usta kartasi — ekranga mos kenglik + 4:3 cover. */
export function ListingCard({
  item,
  onPress,
  onToggleFavorite,
  favorited,
  cardWidth,
  imageWidth,
}: Props) {
  const layout = useHomeLayout();
  // Parent width bersa — qayta dimension subscribe qilmaslik uchun shu qiymat.
  const width = cardWidth ?? layout.cardW;
  const imgW = imageWidth ?? layout.cardImageW;
  const titleSize = layout.fs(13);
  const metaSize = layout.fs(11);
  const priceSize = layout.fs(12);

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
    <Pressable onPress={onPress} style={[styles.card, { width }]}>
      <View style={styles.media}>
        <ResponsiveImage
          uri={item.coverUrl}
          style={StyleSheet.absoluteFill}
          recyclingKey={`${item.id}-${imgW}`}
        />
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
        <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>
          {item.title}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { fontSize: metaSize }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : (
          <View style={styles.metaSpacer} />
        )}
        {price ? (
          <Text style={[styles.price, { fontSize: priceSize }]}>
            {price} <Text style={styles.priceSuffix}>dan</Text>
          </Text>
        ) : (
          <View style={styles.priceSpacer} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 28,
    overflow: "hidden",
    // RN native shadow
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  media: {
    width: "100%",
    aspectRatio: CARD_MEDIA_ASPECT,
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
    minHeight: 64,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  title: {
    fontWeight: "700",
    color: colors.fg,
    letterSpacing: -0.2,
  },
  meta: {
    marginTop: 2,
    color: colors.muted,
  },
  metaSpacer: {
    marginTop: 2,
    height: 14,
  },
  price: {
    marginTop: 4,
    fontWeight: "700",
    color: colors.fg,
  },
  priceSuffix: {
    fontWeight: "700",
    color: colors.fg,
  },
  priceSpacer: {
    marginTop: 4,
    height: 16,
  },
});
