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
const LAP_MS = 5200;
const THUMB = scale(62);
const ORBIT_X = scale(118);
const ORBIT_Y = scale(46);
const STAGE_H = verticalScale(196);

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

/** Mahsulotlar aylana bo‘ylab yuradi va o‘z o‘qi atrofida aylanadi. */
function SpinningProducts({
  items,
  spin,
}: {
  items: AiScanProduct[];
  spin: SharedValue<number>;
}) {
  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.trackRing,
          {
            width: ORBIT_X * 2,
            height: ORBIT_Y * 2,
            borderRadius: ORBIT_X,
            marginLeft: -ORBIT_X,
            marginTop: -ORBIT_Y,
          },
        ]}
      />
      {items.map((product, index) => (
        <SpinningProduct
          key={`${product.id}-${index}`}
          product={product}
          index={index}
          count={items.length}
          spin={spin}
        />
      ))}
    </View>
  );
}

function SpinningProduct({
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
    const n = Math.max(count, 1);
    const t = (spin.value + index / n) * Math.PI * 2;
    const front = (Math.sin(t) + 1) / 2;
    return {
      zIndex: Math.round(front * 20),
      transform: [
        { translateX: Math.cos(t) * ORBIT_X },
        { translateY: Math.sin(t) * ORBIT_Y },
        { rotate: `${spin.value * 360}deg` },
        { scale: 0.74 + front * 0.42 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.disc, animStyle]}>
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
      <SpinningProducts items={items} spin={turn} />

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
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(14),
    paddingHorizontal: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
  },
  stage: {
    height: STAGE_H,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  trackRing: {
    position: "absolute",
    left: "50%",
    top: "50%",
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.08)",
  },
  disc: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    marginTop: -THUMB / 2,
    borderRadius: THUMB / 2,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#111",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  face: { width: "100%", height: "100%" },
  letter: { alignItems: "center", justifyContent: "center", backgroundColor: "#EFEFF1" },
  letterText: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", color: "#111" },
  head: {
    marginTop: verticalScale(4),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  index: { ...morphFont, width: scale(22), fontSize: fontSize(13), fontWeight: "800", color: "#A3A3A3" },
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
