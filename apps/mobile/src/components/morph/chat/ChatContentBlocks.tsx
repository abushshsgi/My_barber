import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import type { ChatContentBlock, ChatHairstyleCard, ChatImageLayout } from "../../../api/ai";
import { resolveMediaUrl } from "../../../api/media";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { ChatMarkdown } from "./ChatMarkdown";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

type Props = {
  blocks: ChatContentBlock[];
  textColor: string;
  textScale: number;
  onOpenHairstyle?: (item: ChatHairstyleCard) => void;
};

function displayUri(item: ChatHairstyleCard, width: number): string {
  return resolveMediaUrl(item.image_url, { width }) || item.image_url;
}

function HairstyleFigure({
  item,
  aspect,
  priority,
  onPress,
}: {
  item: ChatHairstyleCard;
  aspect: number;
  priority: "low" | "normal" | "high";
  onPress: () => void;
}) {
  const { colors: pal, theme } = useMorphAppearance();
  const isDark = theme === "dark";
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const uri = displayUri(item, priority === "high" ? 960 : 640);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={item.name}>
      <View
        style={[
          styles.frame,
          {
            aspectRatio: aspect,
            backgroundColor: isDark ? "#141414" : pal.cardStrong,
          },
        ]}
      >
        {!failed && uri ? (
          <Image
            source={{ uri }}
            style={styles.fill}
            contentFit="cover"
            contentPosition="top"
            cachePolicy="memory-disk"
            priority={priority}
            recyclingKey={item.id}
            transition={160}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />
        ) : null}
        {!loaded && !failed ? <View style={[styles.fill, { backgroundColor: pal.track }]} /> : null}
        {failed ? (
          <View style={styles.fallback}>
            <Ionicons name="image-outline" size={scale(22)} color={pal.muted} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function Caption({ item }: { item: ChatHairstyleCard }) {
  const { t } = useTranslation();
  const { colors: pal } = useMorphAppearance();
  const description = (item.description || "").trim();
  return (
    <View style={styles.caption}>
      <Text style={[styles.name, { color: pal.fg }]} numberOfLines={2}>
        {item.name}
      </Text>
      {description ? (
        <Text style={[styles.desc, { color: pal.muted }]} numberOfLines={3}>
          {description}
        </Text>
      ) : null}
      <Text style={[styles.tryHint, { color: pal.muted }]}>{t("nav.morphTryOn")}</Text>
    </View>
  );
}

function StyleTile({
  item,
  width,
  aspect,
  priority,
  onOpen,
}: {
  item: ChatHairstyleCard;
  width?: number | `${number}%`;
  aspect: number;
  priority: "low" | "normal" | "high";
  onOpen?: (item: ChatHairstyleCard) => void;
}) {
  const open = () => onOpen?.(item);
  return (
    <View style={[styles.tile, width != null ? { width } : styles.tileFlex]}>
      <HairstyleFigure item={item} aspect={aspect} priority={priority} onPress={open} />
      <Pressable onPress={open} accessibilityRole="button">
        <Caption item={item} />
      </Pressable>
    </View>
  );
}

function ImageGroup({
  layout,
  items,
  contentWidth,
  onOpen,
}: {
  layout: ChatImageLayout;
  items: ChatHairstyleCard[];
  contentWidth: number;
  onOpen?: (item: ChatHairstyleCard) => void;
}) {
  const gap = scale(8);

  useEffect(() => {
    const next = items
      .slice(1, 6)
      .map((item) => displayUri(item, 640))
      .filter(Boolean);
    next.forEach((uri) => {
      Image.prefetch(uri).catch(() => undefined);
    });
  }, [items]);

  if (layout === "image_carousel") {
    const cardWidth = Math.round(contentWidth * 0.82);
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + gap}
        contentContainerStyle={{ gap }}
      >
        {items.map((item, index) => (
          <StyleTile
            key={item.id}
            item={item}
            width={cardWidth}
            aspect={0.75}
            priority={index === 0 ? "high" : "low"}
            onOpen={onOpen}
          />
        ))}
      </ScrollView>
    );
  }

  if (layout === "single_image" || items.length === 1) {
    return (
      <StyleTile
        item={items[0]}
        aspect={0.75}
        priority="high"
        onOpen={onOpen}
      />
    );
  }

  const columns = 2;
  const tileWidth = Math.floor((contentWidth - gap) / columns);
  return (
    <View style={[styles.grid, { gap }]}>
      {layout === "comparison" && items.length === 2 ? (
        <View style={[styles.pair, { gap }]}>
          {items.map((item, index) => (
            <StyleTile
              key={item.id}
              item={item}
              width={tileWidth}
              aspect={0.75}
              priority={index === 0 ? "high" : "normal"}
              onOpen={onOpen}
            />
          ))}
        </View>
      ) : (
        items.map((item, index) => (
          <StyleTile
            key={item.id}
            item={item}
            width={tileWidth}
            aspect={0.75}
            priority={index === 0 ? "high" : "low"}
            onOpen={onOpen}
          />
        ))
      )}
    </View>
  );
}

export function ChatContentBlocks({ blocks, textColor, textScale, onOpenHairstyle }: Props) {
  const { width } = useWindowDimensions();
  const contentWidth = Math.max(240, width - scale(18) * 2);
  return (
    <View style={styles.stack}>
      {blocks.map((block, index) => {
        if (block.type === "text") {
          return (
            <ChatMarkdown
              key={`text-${index}`}
              content={block.content}
              color={textColor}
              scale={textScale}
            />
          );
        }
        return (
          <ImageGroup
            key={`img-${block.type}-${index}`}
            layout={block.type}
            items={block.items}
            contentWidth={contentWidth}
            onOpen={onOpenHairstyle}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: "100%",
    gap: verticalScale(12),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pair: {
    flexDirection: "row",
    width: "100%",
  },
  tile: {
    minWidth: 0,
  },
  tileFlex: {
    width: "100%",
  },
  frame: {
    width: "100%",
    borderRadius: moderateScale(16),
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(4),
  },
  name: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "600",
  },
  desc: {
    ...morphFont,
    marginTop: verticalScale(3),
    fontSize: fontSize(12),
    lineHeight: fontSize(16),
  },
  tryHint: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(11),
    fontWeight: "600",
  },
});
