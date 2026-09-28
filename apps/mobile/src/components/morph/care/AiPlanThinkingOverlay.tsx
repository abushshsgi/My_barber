import { Image } from "expo-image";
import { useEffect, useMemo, useRef, useState } from "react";
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
const THUMB = scale(58);
const ORBIT = scale(62);
const LAP_MS = 6400;

function ProductFace({ product }: { product: AiScanProduct }) {
  if (product.image) {
    return (
      <Image
        source={{ uri: product.image }}
        style={styles.face}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={`plan-${product.id}`}
      />
    );
  }
  return (
    <View style={[styles.face, styles.letter]}>
      <Text style={styles.letterText}>{(product.name || "?").slice(0, 1)}</Text>
    </View>
  );
}

/** 2D aylana — webda rotateY ko‘rinmaydi, shu yerda rasm o‘zi ham buriladi. */
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
  const style = useAnimatedStyle(() => {
    const base = (index / Math.max(count, 1)) * 360;
    const lap = spin.value * 360;
    const place = base + lap;
    const deg = ((place % 360) + 360) % 360;
    const nearTop = Math.min(deg, 360 - deg);
    const front = nearTop < 42;
    return {
      zIndex: front ? 3 : 1,
      opacity: front ? 1 : 0.72,
      transform: [
        { rotate: `${place}deg` },
        { translateY: -ORBIT },
        { rotate: `${-place + lap}deg` },
        { scale: front ? 1.08 : 0.86 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.slot, style]}>
      <ProductFace product={product} />
    </Animated.View>
  );
}

/** Bitta mahsulot qatori va bitta jarayon qadami. Takroriy sarlavha yo‘q. */
export function AiPlanThinkingOverlay({ appending, products }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const turn = useSharedValue(0);
  const copy = useSharedValue(1);
  const fill = useSharedValue(0.25);
  const opened = useRef(false);

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

  const count = items.length;
  const step = steps[stepIdx % steps.length];

  useEffect(() => {
    turn.value = 0;
    turn.value = withRepeat(withTiming(1, { duration: LAP_MS, easing: Easing.linear }), -1, false);
  }, [turn]);

  useEffect(() => {
    const tick = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, STEP_MS);
    return () => clearInterval(tick);
  }, [steps.length]);

  useEffect(() => {
    const next = (stepIdx + 1) / steps.length;
    if (!opened.current) {
      opened.current = true;
      fill.value = next;
      return;
    }
    copy.value = 0;
    copy.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
    fill.value = withTiming(next, { duration: 480, easing: Easing.out(Easing.cubic) });
  }, [copy, fill, stepIdx, steps.length]);

  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value }));
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: Math.max(0.08, fill.value) }],
  }));

  return (
    <View
      style={styles.root}
      accessibilityRole="progressbar"
      accessibilityLabel={`${step.title}. ${step.body}`}
    >
      <View style={styles.reel}>
        {items.map((item, index) => (
          <OrbitPhoto
            key={`${item.id}-${index}`}
            product={item}
            index={index}
            count={count}
            spin={turn}
          />
        ))}
      </View>

      <Animated.View style={copyStyle}>
        <View style={styles.head}>
          <Text style={styles.index}>{stepIdx + 1}</Text>
          <Text style={styles.stepTitle} numberOfLines={1}>
            {step.title}
          </Text>
        </View>
        <Text style={styles.stepBody} numberOfLines={2}>
          {step.body}
        </Text>
      </Animated.View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: moderateScale(22),
    backgroundColor: "#FFFFFF",
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(14),
    paddingHorizontal: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  reel: {
    height: ORBIT * 2 + THUMB,
    alignItems: "center",
    justifyContent: "center",
  },
  slot: {
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
  letter: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEFF1",
  },
  letterText: {
    ...morphFont,
    fontSize: fontSize(18),
    fontWeight: "800",
    color: "#111",
  },
  head: {
    marginTop: verticalScale(14),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  index: {
    ...morphFont,
    width: scale(22),
    fontSize: fontSize(13),
    fontWeight: "800",
    color: "#A3A3A3",
  },
  stepTitle: {
    ...morphFont,
    flex: 1,
    fontSize: fontSize(16),
    fontWeight: "800",
    color: "#111",
    letterSpacing: -0.3,
  },
  stepBody: {
    ...morphFont,
    marginTop: verticalScale(4),
    marginLeft: scale(30),
    fontSize: fontSize(13),
    lineHeight: fontSize(18),
    color: "#525252",
  },
  track: {
    marginTop: verticalScale(14),
    height: 3,
    borderRadius: 999,
    backgroundColor: "#F4F4F5",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    width: "100%",
    borderRadius: 999,
    backgroundColor: "#111",
    transformOrigin: "left",
  },
});
