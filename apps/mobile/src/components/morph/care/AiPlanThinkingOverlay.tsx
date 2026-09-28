import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

export type AiScanProduct = {
  id: number | string;
  name: string;
  image?: string | null;
};

type Props = {
  appending?: boolean;
  products?: AiScanProduct[];
};

const STEP_MS = 480;

function Thumb({ product }: { product: AiScanProduct }) {
  if (product.image) {
    return (
      <Image
        source={{ uri: product.image }}
        style={styles.thumb}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={`plan-${product.id}`}
      />
    );
  }
  return (
    <View style={[styles.thumb, styles.thumbPh]}>
      <Text style={styles.thumbLetter}>{(product.name || "AI").slice(0, 1)}</Text>
    </View>
  );
}

/** Ixcham progress — katta orbit o‘rniga past qator. */
export function AiPlanThinkingOverlay({ appending, products }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const progress = useSharedValue(0.12);

  const labels = useMemo(
    () => [
      t("care.routine.aiAnimScan", { defaultValue: "Mahsulotlar o‘qilmoqda" }),
      t("care.routine.aiAnimMatch", { defaultValue: "Sochga moslanmoqda" }),
      t("care.routine.aiAnimWrite", { defaultValue: "Reja yozilmoqda" }),
    ],
    [t],
  );

  const list = (products || []).slice(0, 4);
  const extra = Math.max(0, (products?.length || 0) - list.length);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(0.92, { duration: 900, easing: Easing.out(Easing.cubic) }),
      -1,
      true,
    );
  }, [progress]);

  useEffect(() => {
    const tick = setInterval(() => {
      setStepIdx((i) => (i + 1) % labels.length);
    }, STEP_MS);
    return () => clearInterval(tick);
  }, [labels.length]);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.08, progress.value) }],
  }));

  const title = appending
    ? t("care.routine.aiPlanAppending", { defaultValue: "Yangi mahsulot qo‘shilmoqda" })
    : t("care.routine.aiAnimTitle", { defaultValue: "Reja tuzilmoqda" });

  return (
    <View style={styles.root} accessibilityRole="progressbar">
      <View style={styles.row}>
        <View style={styles.thumbs}>
          {list.length ? (
            list.map((item) => <Thumb key={String(item.id)} product={item} />)
          ) : (
            <View style={[styles.thumb, styles.thumbPh]}>
              <Text style={styles.thumbLetter}>AI</Text>
            </View>
          )}
          {extra > 0 ? (
            <View style={[styles.thumb, styles.thumbPh]}>
              <Text style={styles.thumbLetter}>+{extra}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {labels[stepIdx]}
          </Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );
}

const THUMB = scale(28);

const styles = StyleSheet.create({
  root: {
    marginTop: verticalScale(6),
    borderRadius: moderateScale(16),
    backgroundColor: "#FFFFFF",
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    gap: verticalScale(8),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
  },
  thumbs: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginRight: -scale(8),
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    backgroundColor: "#F4F4F5",
  },
  thumbPh: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbLetter: {
    ...morphFont,
    fontSize: fontSize(9),
    fontWeight: "800",
    color: "#111",
  },
  copy: { flex: 1, minWidth: 0, marginLeft: scale(10) },
  title: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.2,
  },
  sub: {
    ...morphFont,
    marginTop: 1,
    fontSize: fontSize(11),
    color: "#737373",
  },
  barTrack: {
    height: 3,
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#111",
    transformOrigin: "left",
  },
});
