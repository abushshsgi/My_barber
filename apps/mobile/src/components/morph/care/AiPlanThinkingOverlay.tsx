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

type Spot = { x: number; y: number; s: number; z: number };

const STEP_MS = CARE_PROCESS_STEP_MS;
const LAP_MS = 5600;
const FACE = scale(78);
const STAGE_H = verticalScale(196);
const SPAN = scale(132);
const WAVE = scale(28);

/** Yotiq harakat: mahsulotlar chapdan o‘ngga to‘lqin bo‘ylab o‘tadi, o‘rtadagi kattalashadi. */
function spotFor(spin: number, index: number, count: number): Spot {
  "worklet";
  const n = Math.max(count, 1);
  const travel = (((spin + index / n) % 1) + 1) % 1;
  const centered = travel - 0.5;
  const lift = Math.sin(travel * Math.PI);
  return {
    x: centered * SPAN * 2,
    y: (0.35 - lift) * WAVE,
    s: 0.62 + lift * 0.58,
    z: lift,
  };
}

function ProductFace({ product }: { product: AiScanProduct }) {
  if (product.image) {
    return (
      <Image
        source={{ uri: product.image }}
        style={styles.face}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={`spin-${product.id}`}
      />
    );
  }
  return (
    <View style={[styles.face, styles.letter]}>
      <Text style={styles.letterText}>{(product.name || "?").slice(0, 1)}</Text>
    </View>
  );
}

function SpinFace({
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
  const animStyle = useAnimatedStyle(() => {
    const spot = spotFor(spin.value, index, count);
    return {
      zIndex: Math.round(10 + spot.z * 10),
      transform: [{ translateX: spot.x }, { translateY: spot.y }, { scale: spot.s }],
    };
  });
  return (
    <Animated.View style={[styles.faceWrap, animStyle]}>
      <ProductFace product={product} />
    </Animated.View>
  );
}

/** Bitta yotiq to‘lqin. Jarayon qadamlari pastda aytib boriladi. */
export function AiPlanThinkingOverlay({ appending, products }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const turn = useSharedValue(0);

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

  const items = useMemo(() => {
    const list = (products || []).filter((p) => p.name || p.image).slice(0, 6);
    return list.length ? list : [{ id: "hair", name: "" } satisfies AiScanProduct];
  }, [products]);

  const step = steps[stepIdx % steps.length];

  useEffect(() => {
    turn.value = 0;
    turn.value = withRepeat(withTiming(1, { duration: LAP_MS, easing: Easing.linear }), -1, false);
  }, [turn]);

  useEffect(() => {
    const tick = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), STEP_MS);
    return () => clearInterval(tick);
  }, [steps.length]);

  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={`${step.title}. ${step.body}`}>
      <View style={styles.stage}>
        {items.map((product, index) => (
          <SpinFace
            key={`${product.id}-${index}`}
            product={product}
            index={index}
            count={items.length}
            spin={turn}
          />
        ))}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {step.title}
      </Text>
      <Text style={styles.body}>{step.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: moderateScale(22),
    backgroundColor: "#FFFFFF",
    paddingTop: verticalScale(6),
    paddingBottom: verticalScale(12),
    paddingHorizontal: scale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  stage: {
    height: STAGE_H,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  faceWrap: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: FACE,
    height: FACE,
    marginLeft: -FACE / 2,
    marginTop: -FACE / 2,
    borderRadius: FACE / 2,
    overflow: "hidden",
    backgroundColor: "#F3F3F4",
  },
  face: { width: "100%", height: "100%" },
  letter: { alignItems: "center", justifyContent: "center" },
  letterText: { ...morphFont, fontSize: fontSize(16), fontWeight: "800", color: "#111" },
  title: {
    ...morphFont,
    textAlign: "center",
    fontSize: fontSize(15),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
  },
  body: {
    ...morphFont,
    marginTop: verticalScale(4),
    textAlign: "center",
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#737373",
    paddingHorizontal: scale(8),
  },
});
