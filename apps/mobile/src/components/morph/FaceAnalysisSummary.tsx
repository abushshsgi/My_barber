import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import {
  faceShapeLabel,
  hairColorLabel,
  HAIR_COLOR_HEX,
  hairTypeLabel,
} from "../../lib/morph-labels";

type Props = {
  analyze: AiStyleAnalyzeResponse;
  frameW: number;
  frameH: number;
  onStartGenerate: () => void;
  generating?: boolean;
};

type Step = 0 | 1 | 2 | 3 | 4;

function toPercent(value: number | undefined, fallback: number): number {
  const raw = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.max(8, Math.min(100, Math.round(pct)));
}

function animateTo(value: Animated.Value, toValue: number, duration: number) {
  return new Promise<void>((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => resolve());
  });
}

/**
 * Selfie scan frame ichida tahlil: shaffof cutout + width/height chiziqlari
 * ketma-ket chiziladi, keyin Start Generate.
 */
export function FaceAnalysisSummary({
  analyze,
  frameW,
  frameH,
  onStartGenerate,
  generating = false,
}: Props) {
  const widthDraw = useRef(new Animated.Value(0)).current;
  const heightDraw = useRef(new Animated.Value(0)).current;
  const colorDraw = useRef(new Animated.Value(0)).current;
  const ctaEnter = useRef(new Animated.Value(0)).current;
  const [step, setStep] = useState<Step>(0);
  const [ready, setReady] = useState(false);

  const facePct = toPercent(analyze.face_confidence, 0.86);
  const lengthPct = toPercent(analyze.hair_type_confidence, 0.78);
  const colorPct = toPercent(analyze.hair_color_confidence, 0.74);
  const colorKey = analyze.hair_color || "other";
  const hairHex = analyze.hair_color_hex || HAIR_COLOR_HEX[colorKey] || "#5C5C5C";

  const labels = useMemo(
    () => ({
      face: faceShapeLabel(analyze.face_shape),
      length: hairTypeLabel(analyze.hair_type),
      color: hairColorLabel(colorKey),
    }),
    [analyze.face_shape, analyze.hair_type, colorKey],
  );

  useEffect(() => {
    let cancelled = false;
    widthDraw.setValue(0);
    heightDraw.setValue(0);
    colorDraw.setValue(0);
    ctaEnter.setValue(0);
    setStep(0);
    setReady(false);

    const run = async () => {
      // 1) Width — yuz shakli
      setStep(1);
      await animateTo(widthDraw, 1, 900);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 280));

      // 2) Height — soch uzunligi
      setStep(2);
      await animateTo(heightDraw, 1, 900);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 280));

      // 3) Rang
      setStep(3);
      await animateTo(colorDraw, 1, 700);
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 220));

      // 4) Generate
      setStep(4);
      setReady(true);
      Animated.spring(ctaEnter, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    };
    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    analyze.face_shape,
    analyze.hair_type,
    analyze.hair_color,
    analyze.face_confidence,
    analyze.hair_type_confidence,
    analyze.hair_color_confidence,
  ]);

  const widthScale = widthDraw.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 1],
  });
  const heightScale = heightDraw.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 1],
  });

  const statusText =
    step <= 0
      ? "Tahlil boshlanmoqda…"
      : step === 1
        ? "Yuz shakli o‘lchanyapti…"
        : step === 2
          ? "Soch uzunligi o‘lchanyapti…"
          : step === 3
            ? "Soch rangi aniqlanyapti…"
            : "Tahlil tayyor";

  return (
    <View style={styles.root}>
      <View style={[styles.frameWrap, { width: frameW, height: frameH }]}>
        {/* Shaffof oyna — faqat burchaklar va o‘lchov chiziqlari */}
        <View style={styles.cutout} />

        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />

        {/* WIDTH chizig‘i (yuqori) */}
        <View style={styles.widthTrack} pointerEvents="none">
          <View style={styles.cap} />
          <Animated.View
            style={[
              styles.widthLine,
              {
                transform: [{ scaleX: widthScale }],
                opacity: widthDraw,
              },
            ]}
          />
          <View style={styles.cap} />
        </View>
        {step >= 1 ? (
          <View style={styles.widthLabel}>
            <Text style={styles.dimKey}>W</Text>
            <Text style={styles.dimVal}>
              {labels.face} · {facePct}%
            </Text>
          </View>
        ) : null}

        {/* HEIGHT chizig‘i (o‘ng) */}
        <View style={styles.heightTrack} pointerEvents="none">
          <View style={styles.capH} />
          <View style={styles.heightLineSlot}>
            <Animated.View
              style={[
                styles.heightLine,
                {
                  transform: [{ scaleY: heightScale }],
                  opacity: heightDraw,
                },
              ]}
            />
          </View>
          <View style={styles.capH} />
        </View>
        {step >= 2 ? (
          <View style={styles.heightLabel}>
            <Text style={styles.dimKey}>H</Text>
            <Text style={styles.dimVal} numberOfLines={1}>
              {labels.length} · {lengthPct}%
            </Text>
          </View>
        ) : null}

        {/* Rang badge (pastda) */}
        {step >= 3 ? (
          <Animated.View style={[styles.colorBadge, { opacity: colorDraw }]}>
            <View style={[styles.colorDot, { backgroundColor: hairHex }]} />
            <Text style={styles.colorText}>
              {labels.color} · {colorPct}%
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <Text style={styles.hint}>{statusText}</Text>

      <Animated.View
        style={[
          styles.ctaWrap,
          {
            opacity: ctaEnter,
            transform: [
              {
                translateY: ctaEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Pressable
          style={[styles.cta, (!ready || generating) && styles.ctaDisabled]}
          disabled={!ready || generating}
          onPress={onStartGenerate}
          accessibilityRole="button"
          accessibilityLabel="Start Generate"
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="sparkles" size={18} color="#111" />
          </View>
          <Text style={styles.ctaText}>
            {generating ? "Generate…" : "Start Generate"}
          </Text>
          <View style={styles.ctaArrows}>
            {[0, 1, 2, 3].map((i) => (
              <Ionicons
                key={i}
                name="chevron-forward"
                size={14}
                color="#FFF"
                style={{ marginLeft: i === 0 ? 0 : -6, opacity: 0.4 + i * 0.15 }}
              />
            ))}
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    alignItems: "center",
    gap: 16,
  },
  frameWrap: {
    position: "relative",
    borderRadius: 28,
    overflow: "visible",
  },
  cutout: {
    ...StyleSheet.absoluteFill,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "transparent",
  },
  corner: {
    position: "absolute",
    width: 26,
    height: 26,
    borderColor: "#FFF",
  },
  tl: { top: 8, left: 8, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 8 },
  tr: { top: 8, right: 8, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 8 },
  bl: { bottom: 8, left: 8, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 8 },
  br: { bottom: 8, right: 8, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 8 },
  widthTrack: {
    position: "absolute",
    top: 36,
    left: 28,
    right: 28,
    height: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  widthLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  cap: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: "#FFF",
  },
  widthLabel: {
    position: "absolute",
    top: 52,
    alignSelf: "center",
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  heightTrack: {
    position: "absolute",
    top: 56,
    bottom: 56,
    right: 16,
    width: 14,
    alignItems: "center",
  },
  heightLineSlot: {
    flex: 1,
    width: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  heightLine: {
    width: 2,
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  capH: {
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#FFF",
  },
  heightLabel: {
    position: "absolute",
    left: 14,
    top: "46%",
    maxWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  dimKey: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "800",
  },
  dimVal: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  colorBadge: {
    position: "absolute",
    bottom: 18,
    alignSelf: "center",
    left: 24,
    right: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.85)",
  },
  colorText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  hint: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  ctaWrap: {
    width: "100%",
    paddingHorizontal: 4,
    minHeight: 56,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 16,
    backgroundColor: "rgba(20,20,20,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    gap: 12,
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
  ctaArrows: {
    flexDirection: "row",
    alignItems: "center",
  },
});
