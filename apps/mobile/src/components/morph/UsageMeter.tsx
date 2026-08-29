import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import type { ReactNode } from "react";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { morphFont } from "../../theme/morph-font";
import {
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

export function UsageRing({
  pct,
  color,
  size = 156,
  stroke = 11,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const { colors: pal } = useMorphAppearance();
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  const dashOffset = circumference * (1 - clamped / 100);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${cx} ${cy})`}>
          <Circle cx={cx} cy={cy} r={radius} stroke={pal.track} strokeWidth={stroke} fill="none" />
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
          />
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>{children}</View>
      </View>
    </View>
  );
}

export function UsageBar({
  pct,
  color,
  height = 8,
}: {
  pct: number;
  color: string;
  height?: number;
}) {
  const { colors: pal } = useMorphAppearance();
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={[styles.barTrack, { height, backgroundColor: pal.track, flexDirection: "row" }]}>
      <View style={{ flex: Math.max(clamped, 0.001), backgroundColor: color, borderRadius: height / 2 }} />
      <View style={{ flex: Math.max(100 - clamped, 0.001) }} />
    </View>
  );
}

export function UsageMeter({
  pct,
  color,
  caption,
  usedLabel,
  leftLabel,
}: {
  pct: number;
  color: string;
  caption: string;
  usedLabel: string;
  leftLabel: string;
}) {
  const { colors: pal, fs } = useMorphAppearance();
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={[styles.meter, { backgroundColor: pal.card, borderColor: pal.line }]}>
      <Text style={[styles.pct, { color: pal.fg, fontSize: fs(52) }]}>{clamped}%</Text>
      <Text style={[styles.caption, { color: pal.muted, fontSize: fs(13) }]}>{caption}</Text>
      <UsageBar pct={clamped} color={color} height={14} />
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.legendText, { color: pal.fg, fontSize: fs(13) }]}>{usedLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: pal.track }]} />
          <Text style={[styles.legendText, { color: pal.muted, fontSize: fs(13) }]}>{leftLabel}</Text>
        </View>
      </View>
      <View style={styles.scale}>
        <Text style={[styles.scaleText, { color: pal.muted, fontSize: fs(11) }]}>0%</Text>
        <Text style={[styles.scaleText, { color: pal.muted, fontSize: fs(11) }]}>100%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  barTrack: {
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  meter: {
    borderRadius: moderateScale(22),
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(22),
    paddingBottom: verticalScale(16),
    gap: moderateScale(12),
  },
  pct: {
    ...morphFont,
    fontWeight: "800",
    letterSpacing: -2,
    textAlign: "center",
  },
  caption: {
    ...morphFont,
    textAlign: "center",
    marginTop: -verticalScale(4),
    marginBottom: verticalScale(6),
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: moderateScale(12),
    marginTop: verticalScale(4),
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: moderateScale(8), flex: 1 },
  dot: { width: scale(8), height: scale(8), borderRadius: moderateScale(2) },
  legendText: { ...morphFont, fontWeight: "600", flex: 1 },
  scale: { flexDirection: "row", justifyContent: "space-between" },
  scaleText: { ...morphFont, fontWeight: "600" },
});
