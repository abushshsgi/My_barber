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
import { CARE_PROCESS_STEP_MS } from "../../../lib/care-think";
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

type ProcessStep = { title: string; body: string };

const STEP_MS = CARE_PROCESS_STEP_MS;
const LAP_MS = 6800;
const THUMB = scale(72);
const ORBIT_X = scale(108);

function ProductFace({ product }: { product: AiScanProduct }) {
  if (product.image) {
    return (
      <Image
        source={{ uri: product.image }}
        style={styles.face}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={`reel-${product.id}`}
      />
    );
  }
  return (
    <View style={[styles.face, styles.thumbPh]}>
      <Text style={styles.thumbLetter}>{(product.name || "?").slice(0, 1)}</Text>
    </View>
  );
}

/** Mahsulot gorizontal karuselda aylanadi, oldinda turgani kattalashadi. */
function ReelProduct({
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
  const style = useAnimatedStyle(() => {
    if (count <= 1) {
      const yaw = Math.sin(spin.value * Math.PI * 2) * 32;
      return {
        zIndex: 2,
        opacity: 1,
        transform: [{ perspective: 640 }, { rotateY: `${yaw}deg` }, { scale: 1.08 }],
      };
    }
    const angle = (index / Math.max(count, 1) + spin.value) * Math.PI * 2;
    const depth = Math.cos(angle);
    const front = (depth + 1) / 2;
    const yaw = Math.sin(angle) * (18 + front * 16);
    return {
      zIndex: Math.round(front * 20),
      opacity: 0.4 + front * 0.6,
      transform: [
        { translateX: Math.sin(angle) * ORBIT_X },
        { translateY: (1 - depth) * 8 },
        { perspective: 640 },
        { rotateY: `${yaw}deg` },
        { scale: 0.56 + front * 0.52 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.thumb, style]}>
      <ProductFace product={product} />
    </Animated.View>
  );
}

/** Mahsulotlar karuselda aylanadi, pastda jarayon sekin aytiladi. */
export function AiPlanThinkingOverlay({ appending, products }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const [prodIdx, setProdIdx] = useState(0);
  const spin = useSharedValue(0);
  const copy = useSharedValue(1);

  const steps = useMemo<ProcessStep[]>(() => {
    if (appending) {
      return [
        {
          title: t("care.routine.aiProcessAdd", { defaultValue: "Yangi mahsulot o‘qilmoqda" }),
          body: t("care.routine.aiProcessAddBody", {
            defaultValue: "Turi aniqlanib, mavjud rejaga joylanmoqda.",
          }),
        },
        {
          title: t("care.routine.aiProcessMatch", { defaultValue: "Soch holatiga moslash" }),
          body: t("care.routine.aiProcessMatchBody", {
            defaultValue: "Sochingiz holatiga qarab, qaysi mahsulot qachon kerakligi ajratilmoqda.",
          }),
        },
        {
          title: t("care.routine.aiProcessWrite", { defaultValue: "Reja yozilmoqda" }),
          body: t("care.routine.aiProcessWriteBody", {
            defaultValue: "Shaxsiy parvarish rejasi yakunlanmoqda.",
          }),
        },
      ];
    }
    return [
      {
        title: t("care.routine.aiProcessRead", { defaultValue: "Mahsulotlar o‘qilmoqda" }),
        body: t("care.routine.aiProcessReadBody", {
          defaultValue: "Har bir vositaning nomi va turi ko‘rib chiqilmoqda.",
        }),
      },
      {
        title: t("care.routine.aiProcessMatch", { defaultValue: "Soch holatiga moslash" }),
        body: t("care.routine.aiProcessMatchBody", {
          defaultValue: "Sochingiz holatiga qarab, qaysi mahsulot qachon kerakligi ajratilmoqda.",
        }),
      },
      {
        title: t("care.routine.aiProcessOrder", { defaultValue: "Kun tartibi tuzilmoqda" }),
        body: t("care.routine.aiProcessOrderBody", {
          defaultValue: "Ertalab, kechqurun va haftalik qadamlar joylashtirilmoqda.",
        }),
      },
      {
        title: t("care.routine.aiProcessWrite", { defaultValue: "Reja yozilmoqda" }),
        body: t("care.routine.aiProcessWriteBody", {
          defaultValue: "Shaxsiy parvarish rejasi yakunlanmoqda.",
        }),
      },
    ];
  }, [appending, t]);

  const list = (products || []).filter((p) => p.name || p.image).slice(0, 6);
  const items = list.length ? list : [{ id: "hair", name: "" } satisfies AiScanProduct];
  const count = items.length;
  const current = items[((prodIdx % count) + count) % count];
  const step = steps[stepIdx % steps.length];

  useEffect(() => {
    spin.value = 0;
    spin.value = withRepeat(
      withTiming(1, { duration: LAP_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [spin]);

  useEffect(() => {
    const tick = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, STEP_MS);
    return () => clearInterval(tick);
  }, [steps.length]);

  useEffect(() => {
    if (count < 2) return;
    const started = Date.now();
    const tick = setInterval(() => {
      const t = ((Date.now() - started) % LAP_MS) / LAP_MS;
      const front = (count - Math.round(t * count)) % count;
      setProdIdx(front < 0 ? front + count : front);
    }, 180);
    return () => clearInterval(tick);
  }, [count]);

  useEffect(() => {
    copy.value = 0.15;
    copy.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [copy, stepIdx]);

  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value }));

  const title = appending
    ? t("care.routine.aiPlanAppending", { defaultValue: "Yangi mahsulot qo‘shilmoqda" })
    : t("care.routine.aiAnimTitle", { defaultValue: "Reja tuzilmoqda" });

  const showName = Boolean(current.name && current.name !== "AI");

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={`${title}. ${step.title}. ${step.body}`}
    >
      <View style={styles.stage}>
        <View style={styles.platter} />
        {items.map((item, index) => (
          <ReelProduct
            key={`${item.id}-${index}`}
            product={item}
            index={index}
            count={count}
            spin={spin}
          />
        ))}
      </View>

      {showName ? (
        <Text style={styles.productName} numberOfLines={1}>
          {current.name}
        </Text>
      ) : null}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <Animated.View style={[styles.copy, copyStyle]}>
        <Text style={styles.kicker}>
          {t("care.routine.aiProcessKicker", { defaultValue: "Jarayon" })}
          {"  "}
          {stepIdx + 1}/{steps.length}
        </Text>
        <Text style={styles.stepTitle} numberOfLines={1}>
          {step.title}
        </Text>
        <Text style={styles.stepBody} numberOfLines={3}>
          {step.body}
        </Text>
      </Animated.View>

      <View style={styles.dots}>
        {steps.map((item, index) => (
          <View key={item.title} style={[styles.dot, index === stepIdx && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: verticalScale(8),
    borderRadius: moderateScale(22),
    backgroundColor: "#FFFFFF",
    paddingTop: verticalScale(14),
    paddingBottom: verticalScale(14),
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
    width: "100%",
    height: scale(128),
    alignItems: "center",
    justifyContent: "center",
  },
  platter: {
    position: "absolute",
    width: scale(220),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#F3F3F4",
    bottom: scale(8),
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    overflow: "hidden",
    backgroundColor: "#F4F4F5",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  face: {
    width: "100%",
    height: "100%",
  },
  thumbPh: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFF1",
  },
  thumbLetter: {
    ...morphFont,
    fontSize: fontSize(16),
    fontWeight: "800",
    color: "#111",
  },
  productName: {
    ...morphFont,
    marginTop: verticalScale(6),
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
    maxWidth: "86%",
  },
  title: {
    ...morphFont,
    marginTop: verticalScale(4),
    fontSize: fontSize(15),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  copy: {
    marginTop: verticalScale(8),
    alignItems: "center",
    minHeight: verticalScale(62),
  },
  kicker: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#A3A3A3",
    textAlign: "center",
  },
  stepTitle: {
    ...morphFont,
    marginTop: verticalScale(3),
    fontSize: fontSize(14),
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
  },
  stepBody: {
    ...morphFont,
    marginTop: verticalScale(2),
    fontSize: fontSize(12),
    lineHeight: fontSize(17),
    color: "#525252",
    textAlign: "center",
    maxWidth: scale(300),
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginTop: verticalScale(10),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#E5E5E5",
  },
  dotOn: {
    width: scale(16),
    backgroundColor: "#111",
  },
});
