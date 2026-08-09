import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import type { AiStyleAnalyzeResponse } from "../../api/ai";
import {
  beardLabel,
  faceShapeLabel,
  HAIR_COLOR_HEX,
  hairColorLabel,
  hairTextureLabel,
  hairTypeLabel,
} from "../../lib/morph-labels";

type Props = {
  analyze: AiStyleAnalyzeResponse;
  size?: number;
};

type Slice = {
  key: string;
  label: string;
  value: string;
  color: string;
};

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
) {
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const o1 = polar(cx, cy, rOuter, startAngle);
  const o2 = polar(cx, cy, rOuter, endAngle);
  const i2 = polar(cx, cy, rInner, endAngle);
  const i1 = polar(cx, cy, rInner, startAngle);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i1.x} ${i1.y}`,
    "Z",
  ].join(" ");
}

/**
 * Asl selfie tahlili — aylana diagramma (yuz, uzunlik, rang, tekstura, soqol).
 */
export function FaceAnalysisRing({ analyze, size = 220 }: Props) {
  const slices = useMemo<Slice[]>(() => {
    const colorKey = analyze.hair_color || "other";
    const hex = analyze.hair_color_hex || HAIR_COLOR_HEX[colorKey] || "#5C5C5C";
    return [
      {
        key: "face",
        label: "Yuz",
        value: faceShapeLabel(analyze.face_shape),
        color: "#0A0A0A",
      },
      {
        key: "length",
        label: "Uzunlik",
        value: hairTypeLabel(analyze.hair_type),
        color: "#404040",
      },
      {
        key: "color",
        label: "Rang",
        value: hairColorLabel(colorKey),
        color: hex,
      },
      {
        key: "texture",
        label: "Tekstura",
        value: hairTextureLabel(analyze.hair_texture || "straight"),
        color: "#6B6B6B",
      },
      {
        key: "beard",
        label: "Soqol",
        value: beardLabel(analyze.beard || "none"),
        color: "#8E8E93",
      },
    ];
  }, [analyze]);

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.42;
  const rInner = size * 0.24;
  const gap = 3;
  const step = 360 / slices.length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Sizning tahlilingiz</Text>
      <Text style={styles.sub}>Asl selfie holati (yangi uslubdan oldin)</Text>

      <View style={[styles.ringBox, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <G>
            {slices.map((slice, i) => {
              const start = i * step + gap / 2;
              const end = (i + 1) * step - gap / 2;
              return (
                <Path
                  key={slice.key}
                  d={arcPath(cx, cy, rOuter, rInner, start, end)}
                  fill={slice.color}
                />
              );
            })}
            <Circle cx={cx} cy={cy} r={rInner - 2} fill="#FFFFFF" />
          </G>
        </Svg>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerEyebrow}>PROFIL</Text>
          <Text style={styles.centerValue} numberOfLines={2}>
            {faceShapeLabel(analyze.face_shape)}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: slice.color }]} />
            <View style={styles.legendText}>
              <Text style={styles.legendLabel}>{slice.label}</Text>
              <Text style={styles.legendValue} numberOfLines={1}>
                {slice.value}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {analyze.summary_uz ? (
        <Text style={styles.summary} numberOfLines={3}>
          {analyze.summary_uz}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    alignItems: "center",
  },
  title: {
    alignSelf: "stretch",
    fontSize: 16,
    fontWeight: "800",
    color: "#0A0A0A",
    letterSpacing: -0.2,
  },
  sub: {
    alignSelf: "stretch",
    marginTop: -6,
    fontSize: 12,
    fontWeight: "600",
    color: "#8E8E93",
  },
  ringBox: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  centerEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#A3A3A3",
    marginBottom: 4,
  },
  centerValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0A0A0A",
    textAlign: "center",
  },
  legend: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  legendText: { flex: 1, minWidth: 0 },
  legendLabel: { fontSize: 10, fontWeight: "700", color: "#8E8E93" },
  legendValue: { fontSize: 12, fontWeight: "800", color: "#0A0A0A" },
  summary: {
    alignSelf: "stretch",
    fontSize: 13,
    lineHeight: 18,
    color: "#525252",
  },
});
