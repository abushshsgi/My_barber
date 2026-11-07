import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { ChatHairstyleCard } from "../../../api/ai";
import { resolveMediaUrl } from "../../../api/media";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

type Props = {
  items: ChatHairstyleCard[];
  onOpen: (item: ChatHairstyleCard) => void;
};

function StyleCard({
  item,
  width,
  onOpen,
}: {
  item: ChatHairstyleCard;
  width: number;
  onOpen: (item: ChatHairstyleCard) => void;
}) {
  const { t } = useTranslation();
  const { colors: pal, theme } = useMorphAppearance();
  const isDark = theme === "dark";
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = resolveMediaUrl(item.image_url, { width: 640 }) || item.image_url;
  const description = (item.description || "").trim();

  return (
    <View
      style={[
        styles.card,
        { width, backgroundColor: pal.card, borderColor: pal.line },
      ]}
    >
      <Pressable
        onPress={() => onOpen(item)}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <View style={[styles.imageWrap, { backgroundColor: isDark ? "#141414" : pal.cardStrong }]}>
          {!failed && uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              contentFit="cover"
              transition={180}
              recyclingKey={item.id}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          ) : null}
          {!loaded && !failed ? <View style={[styles.skeleton, { backgroundColor: pal.track }]} /> : null}
          {failed ? (
            <View style={styles.fallback}>
              <Ionicons name="image-outline" size={scale(22)} color={pal.muted} />
            </View>
          ) : null}
        </View>
        <Text style={[styles.name, { color: pal.fg }]} numberOfLines={2}>
          {item.name}
        </Text>
        {description ? (
          <Text style={[styles.desc, { color: pal.muted }]} numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => onOpen(item)}
        style={[styles.tryBtn, { borderColor: pal.line }]}
        accessibilityRole="button"
        accessibilityLabel={t("nav.morphTryOn")}
      >
        <Text style={[styles.tryText, { color: pal.fg }]}>{t("nav.morphTryOn")}</Text>
      </Pressable>
    </View>
  );
}

export function ChatHairstyleCarousel({ items, onOpen }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(scale(168), Math.max(scale(140), width * 0.58));
  if (!items.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
    >
      {items.map((item) => (
        <StyleCard key={item.id} item={item} width={cardWidth} onOpen={onOpen} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    marginTop: verticalScale(10),
  },
  row: {
    gap: scale(10),
    paddingRight: scale(8),
  },
  card: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    padding: scale(8),
  },
  imageWrap: {
    height: verticalScale(148),
    borderRadius: moderateScale(12),
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    ...morphFont,
    marginTop: verticalScale(8),
    fontSize: fontSize(13),
    fontWeight: "600",
  },
  desc: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
  },
  tryBtn: {
    marginTop: verticalScale(8),
    borderWidth: 1,
    borderRadius: moderateScale(999),
    alignSelf: "flex-start",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  tryText: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
  },
});
