import { Image } from "expo-image";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
const LAP_MS = 4200;
const FACE = scale(58);
const STAGE_H = verticalScale(248);
const R = scale(108);
const R_CIRCLE = scale(88);
const R_WIDE = scale(120);
const R_FLAT = scale(36);
const R_TALL = scale(96);
const R_NARROW = scale(28);
const R_EIGHT = scale(78);
const R_IN = scale(42);
const R_OUT = scale(70);
const R_DEEP = scale(70);

const VARIANTS = [
  "Aylana",
  "Yotiq",
  "G‘ildirak",
  "Sakkiz",
  "Spiral",
  "Qarama-qarshi",
  "Yoy",
  "Karusel",
  "Ikki halqa",
  "Markaz",
];

let pickedVariant = 0;

function spotFor(mode: number, spin: number, index: number, count: number): Spot {
  "worklet";
  const n = Math.max(count, 1);
  const base = index / n;

  if (mode === 1) {
    const t = (spin + base) * Math.PI * 2;
    const z = (Math.sin(t) + 1) / 2;
    return { x: Math.cos(t) * R_WIDE, y: Math.sin(t) * R_FLAT, s: 0.72 + z * 0.38, z };
  }
  if (mode === 2) {
    const t = (spin + base) * Math.PI * 2;
    const z = (Math.cos(t) + 1) / 2;
    return { x: Math.cos(t) * R_NARROW, y: Math.sin(t) * R_TALL, s: 0.62 + z * 0.5, z };
  }
  if (mode === 3) {
    const t = (spin + base) * Math.PI * 2;
    const z = (Math.cos(t) + 1) / 2;
    return { x: Math.sin(t) * R, y: Math.sin(t) * Math.cos(t) * R_EIGHT, s: 0.7 + z * 0.35, z };
  }
  if (mode === 4) {
    const t = (spin + base) * Math.PI * 2;
    const rad = R_IN + R_OUT * (0.5 + 0.5 * Math.sin(t));
    return { x: Math.cos(t) * rad, y: Math.sin(t) * rad * 0.72, s: 0.78 + (rad / (R_IN + R_OUT)) * 0.28, z: rad };
  }
  if (mode === 5) {
    const dir = index % 2 === 0 ? 1 : -1;
    const t = (dir * spin + base) * Math.PI * 2;
    return { x: Math.cos(t) * R, y: Math.sin(t) * R * 0.78, s: 0.9, z: Math.sin(t) };
  }
  if (mode === 6) {
    const swing = Math.sin((spin + base) * Math.PI * 2);
    const ang = Math.PI * (1.15 + swing * 0.7);
    return { x: Math.cos(ang) * R_WIDE, y: Math.sin(ang) * R_DEEP + 10, s: 0.92, z: -Math.sin(ang) };
  }
  if (mode === 7) {
    const t = (spin + base) * Math.PI * 2;
    const z = (Math.sin(t) + 1) / 2;
    return { x: Math.cos(t) * R, y: Math.sin(t) * R_DEEP, s: 0.5 + z * 0.7, z };
  }
  if (mode === 8) {
    const ring = index % 2 === 0 ? 0.62 : 1;
    const dir = index % 2 === 0 ? 1 : -1;
    const t = (dir * spin + base) * Math.PI * 2;
    return {
      x: Math.cos(t) * R * ring,
      y: Math.sin(t) * R_EIGHT * ring,
      s: ring > 0.8 ? 0.95 : 0.72,
      z: ring + Math.sin(t),
    };
  }
  if (mode === 9) {
    const p = spin * n;
    const active = ((p % n) + n) % n;
    const dist = Math.min(Math.abs(index - active), n - Math.abs(index - active));
    const focus = Math.max(0, 1 - dist);
    const t = (spin + base) * Math.PI * 2;
    return {
      x: Math.cos(t) * R_CIRCLE * (1 - focus),
      y: Math.sin(t) * R_CIRCLE * (1 - focus),
      s: 0.7 + focus * 0.55,
      z: focus,
    };
  }
  const t = (spin + base) * Math.PI * 2;
  return { x: Math.cos(t) * R_CIRCLE, y: Math.sin(t) * R_CIRCLE, s: 1, z: Math.sin(t) };
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
  mode,
}: {
  product: AiScanProduct;
  index: number;
  count: number;
  spin: SharedValue<number>;
  mode: number;
}) {
  const animStyle = useAnimatedStyle(() => {
    const spot = spotFor(mode, spin.value, index, count);
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

/** Mahsulotlar to‘g‘ri turib, 10 xil yo‘l bilan aylanadi. */
export function AiPlanThinkingOverlay({ appending, products }: Props) {
  const { t } = useTranslation();
  const [stepIdx, setStepIdx] = useState(0);
  const [variant, setVariant] = useState(pickedVariant);
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
            mode={variant}
          />
        ))}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {step.title}
      </Text>
      <View style={styles.picker}>
        {VARIANTS.map((name, index) => {
          const on = index === variant;
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}. ${name}`}
              onPress={() => {
                pickedVariant = index;
                setVariant(index);
              }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{index + 1}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.variantName}>
        {variant + 1}. {VARIANTS[variant]}
      </Text>
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
  picker: {
    marginTop: verticalScale(10),
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(4),
  },
  chip: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F4F5",
  },
  chipOn: { backgroundColor: "#111" },
  chipText: { ...morphFont, fontSize: fontSize(11), fontWeight: "800", color: "#111" },
  chipTextOn: { color: "#fff" },
  variantName: {
    ...morphFont,
    marginTop: verticalScale(6),
    textAlign: "center",
    fontSize: fontSize(12),
    fontWeight: "700",
    color: "#737373",
  },
});
