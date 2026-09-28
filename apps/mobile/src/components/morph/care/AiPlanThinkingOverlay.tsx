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
  type SharedValue,
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

const STEP_MS = 700;
const STAGE = scale(168);
const THUMB = scale(46);
const ORBIT = scale(52);
const LAP_MS = 3200;

function OrbitPhoto({
  product,
  index,
  count,
  spin,
}: {
  product: AiScanProduct;
  index: number;
  count: number;
  spin: SharedValue<number>;
}) {
  const base = (index / Math.max(count, 1)) * 360;
  const style = useAnimatedStyle(() => {
    const turn = spin.value * 360;
    const angle = (((base + turn) % 360) + 360) % 360;
    const nearTop = Math.min(angle, 360 - angle);
    const scaleN = nearTop < 36 ? 1.08 : 0.94;
    return {
      zIndex: nearTop < 36 ? 3 : 1,
      transform: [
        { rotate: `${base + turn}deg` },
        { translateY: -ORBIT },
        { rotate: `${-(base + turn)}deg` },
        { scale: scaleN },
      ],
    };
  });

  return (
    <Animated.View style={[styles.orbitSlot, style]}>
      {product.image ? (
        <Image
          source={{ uri: product.image }}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={`orbit-${product.id}`}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbPh]}>
          <Text style={styles.thumbLetter}>{(product.name || "AI").slice(0, 1)}</Text>
        </View>
      )}
    </Animated.View>
  );
}

/** Mahsulot rasmlari halqa bo‘ylab aylanadi, o‘zlari tik turadi. */
export function AiPlanThinkingOverlay({ appending, products }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const spin = useSharedValue(0);
  const ring = useSharedValue(0);
  const progress = useSharedValue(0.2);

  const labels = useMemo(
    () => [
      t("care.routine.aiAnimScan", { defaultValue: "Mahsulotlar o‘qilmoqda" }),
      t("care.routine.aiAnimMatch", { defaultValue: "Sochga moslanmoqda" }),
      t("care.routine.aiAnimWrite", { defaultValue: "Reja yozilmoqda" }),
    ],
    [t],
  );

  const list = (products || []).slice(0, 6);
  const orbitItems = list.length
    ? list
    : [{ id: "ai", name: "AI" } satisfies AiScanProduct];

  useEffect(() => {
    spin.value = 0;
    spin.value = withRepeat(withTiming(1, { duration: LAP_MS, easing: Easing.linear }), -1, false);
    ring.value = 0;
    ring.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.linear }), -1, false);
    progress.value = withTiming(0.92, { duration: 1600, easing: Easing.out(Easing.cubic) });
  }, [progress, ring, spin]);

  useEffect(() => {
    const tick = setInterval(() => {
      setStepIdx((i) => (i + 1) % labels.length);
    }, STEP_MS);
    return () => clearInterval(tick);
  }, [labels.length]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ring.value * 360}deg` }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.08, progress.value) }],
  }));

  const title = appending
    ? t("care.routine.aiPlanAppending", { defaultValue: "Yangi mahsulot qo‘shilmoqda" })
    : t("care.routine.aiAnimTitle", { defaultValue: "Reja tuzilmoqda" });

  return (
    <View style={styles.root} accessibilityRole="progressbar">
      <View style={styles.stage}>
        <View style={styles.ringTrack} />
        <Animated.View style={[styles.ringArcWrap, ringStyle]}>
          <View style={styles.ringArc} />
        </Animated.View>
        <View style={styles.core}>
          <Text style={styles.coreText}>AI</Text>
        </View>
        {orbitItems.map((item, index) => (
          <OrbitPhoto
            key={String(item.id)}
            product={item}
            index={index}
            count={orbitItems.length}
            spin={spin}
          />
        ))}
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.sub} numberOfLines={1}>
        {labels[stepIdx]}
      </Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: verticalScale(8),
    borderRadius: moderateScale(22),
    backgroundColor: "#FFFFFF",
    paddingTop: verticalScale(6),
    paddingBottom: verticalScale(12),
    paddingHorizontal: scale(16),
    alignItems: "center",
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    shadowColor: "#111",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringTrack: {
    position: "absolute",
    width: ORBIT * 2 + scale(8),
    height: ORBIT * 2 + scale(8),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
    backgroundColor: "#FAFAFA",
  },
  ringArcWrap: {
    position: "absolute",
    width: ORBIT * 2 + scale(8),
    height: ORBIT * 2 + scale(8),
    alignItems: "center",
  },
  ringArc: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#111",
    marginTop: -scale(4),
  },
  core: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  coreText: {
    ...morphFont,
    color: "#FFFFFF",
    fontSize: fontSize(13),
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  orbitSlot: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    overflow: "hidden",
    backgroundColor: "#F4F4F5",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#111",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPh: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
  },
  thumbLetter: {
    ...morphFont,
    fontSize: fontSize(14),
    fontWeight: "800",
    color: "#111",
  },
  title: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  sub: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(12),
    color: "#737373",
    textAlign: "center",
  },
  barTrack: {
    marginTop: verticalScale(10),
    width: "72%",
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
