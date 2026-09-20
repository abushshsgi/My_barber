import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { HairRecommendation } from "../../types/weatherShield";
import { colors } from "../../theme/colors";
import { morphFont } from "../../theme/morph-font";
import { fontSize, moderateScale, scale } from "../../utils/responsive";

type Props = {
  item: HairRecommendation;
  index: number;
  variant?: "featured" | "tile" | "step";
  tileWidth?: number;
  done?: boolean;
  onToggleDone?: () => void;
};

const TYPE_LABEL: Record<HairRecommendation["type"], string> = {
  product: "Mahsulot",
  style: "Uslub",
  routine: "Rutina",
};

function DoneCheck({
  done,
  onToggle,
  size = 22,
}: {
  done: boolean;
  onToggle?: () => void;
  size?: number;
}) {
  if (!onToggle) return null;
  const iconSize = Math.max(11, Math.round(size * 0.55));
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? "Bajarildi" : "Belgila"}
      style={[
        styles.checkBtn,
        { width: scale(size), height: scale(size), borderRadius: moderateScale(7) },
        done ? styles.checkBtnOn : styles.checkBtnOff,
      ]}
    >
      <Ionicons
        name={done ? "checkmark" : "square-outline"}
        size={iconSize}
        color={done ? "#fff" : colors.fg}
      />
    </Pressable>
  );
}

/** Soft Paper kartalar — to‘liq rasm + bosilishi aniq checkbox. */
export function RecommendationCard({
  item,
  index,
  variant = "step",
  tileWidth,
  done = false,
  onToggleDone,
}: Props) {
  const { width } = useWindowDimensions();
  const step = String(index + 1).padStart(2, "0");

  if (variant === "featured") {
    const imgSize = scale(80);
    return (
      <View style={[styles.featured, done && styles.cardDone]}>
        <View style={[styles.featuredImg, { width: imgSize, height: imgSize }]}>
          {item.image ? (
            <Image source={item.image} style={styles.imgFill} contentFit="contain" />
          ) : (
            <Ionicons
              name={(item.icon as keyof typeof Ionicons.glyphMap) || "flask-outline"}
              size={22}
              color={colors.fg}
            />
          )}
        </View>
        <View style={styles.featuredBody}>
          <View style={styles.metaRow}>
            <Text style={styles.stepMuted}>{step}</Text>
            <Text style={styles.typeMuted}>{TYPE_LABEL[item.type]}</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.featuredDesc} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
        <DoneCheck done={done} onToggle={onToggleDone} size={24} />
      </View>
    );
  }

  if (variant === "tile") {
    const w = tileWidth ?? (width - scale(16) * 2 - moderateScale(8)) / 2;
    return (
      <View style={[styles.tile, { width: w }, done && styles.cardDone]}>
        <View style={styles.tileImg}>
          {item.image ? (
            <Image source={item.image} style={styles.imgFill} contentFit="contain" />
          ) : (
            <Ionicons
              name={(item.icon as keyof typeof Ionicons.glyphMap) || "sparkles-outline"}
              size={28}
              color={colors.fg}
            />
          )}
          <View style={styles.tileCheckWrap}>
            <DoneCheck done={done} onToggle={onToggleDone} size={22} />
          </View>
        </View>
        <Text style={styles.tileType}>{TYPE_LABEL[item.type]}</Text>
        <Text style={styles.tileTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.tileDesc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.stepRow, done && styles.cardDone]}>
      <DoneCheck done={done} onToggle={onToggleDone} size={20} />
      <View style={styles.stepBody}>
        <Text style={styles.stepType}>
          {step} · {TYPE_LABEL[item.type]}
        </Text>
        <Text style={styles.stepTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.stepDesc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      {item.image ? (
        <View style={styles.stepThumb}>
          <Image source={item.image} style={styles.imgFill} contentFit="contain" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  imgFill: { width: "100%", height: "100%" },
  cardDone: { opacity: 0.62 },

  featured: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: moderateScale(16),
    padding: moderateScale(10),
    gap: moderateScale(10),
  },
  featuredImg: {
    borderRadius: moderateScale(12),
    backgroundColor: "#F7F4EF",
    overflow: "hidden",
    padding: scale(6),
  },
  featuredBody: { flex: 1, minWidth: 0, gap: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepMuted: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    color: colors.muted,
  },
  typeMuted: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
  },
  featuredTitle: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "800",
    color: colors.fg,
  },
  featuredDesc: {
    ...morphFont,
    fontSize: fontSize(11),
    lineHeight: fontSize(15),
    color: colors.muted,
  },

  checkBtn: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  checkBtnOff: {
    backgroundColor: "#FFFDF9",
    borderWidth: 1.5,
    borderColor: "rgba(28,25,23,0.18)",
  },
  checkBtnOn: {
    backgroundColor: "#16A34A",
    borderWidth: 1.5,
    borderColor: "#15803D",
  },

  tile: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(14),
    padding: moderateScale(8),
    gap: 3,
  },
  tileImg: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: moderateScale(12),
    backgroundColor: "#F7F4EF",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(10),
    marginBottom: 2,
    overflow: "hidden",
  },
  tileCheckWrap: {
    position: "absolute",
    top: scale(6),
    right: scale(6),
  },
  tileType: {
    ...morphFont,
    fontSize: fontSize(9),
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
  tileTitle: {
    ...morphFont,
    fontSize: fontSize(12),
    fontWeight: "800",
    color: colors.fg,
  },
  tileDesc: {
    ...morphFont,
    fontSize: fontSize(10),
    lineHeight: fontSize(14),
    color: colors.muted,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    backgroundColor: colors.surface,
    borderRadius: moderateScale(14),
    padding: moderateScale(8),
  },
  stepBody: { flex: 1, minWidth: 0, gap: 1 },
  stepType: {
    ...morphFont,
    fontSize: fontSize(9),
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
  stepTitle: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    color: colors.fg,
  },
  stepDesc: {
    ...morphFont,
    fontSize: fontSize(11),
    lineHeight: fontSize(15),
    color: colors.muted,
  },
  stepThumb: {
    width: scale(52),
    height: scale(52),
    borderRadius: moderateScale(10),
    backgroundColor: "#F7F4EF",
    overflow: "hidden",
    padding: scale(4),
  },
});
