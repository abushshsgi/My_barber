import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { morphFont } from "../../theme/morph-font";

function formatCount(n: number): string {
  return Math.max(0, Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

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
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={pal.track}
            strokeWidth={stroke}
            fill="none"
          />
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

export function UsageMeter({
  pct,
  used,
  remaining,
  limit,
  usedLabel,
  leftLabel,
  color,
}: {
  pct: number;
  used: number;
  remaining: number;
  limit: number;
  usedLabel: string;
  leftLabel: string;
  color: string;
}) {
  const { colors: pal, fs } = useMorphAppearance();
  return (
    <View style={styles.meterBlock}>
      <UsageRing pct={pct} color={color} size={156} stroke={11}>
        <Text style={[styles.meterPctBig, { color: pal.fg, fontSize: fs(36) }]}>{pct}%</Text>
      </UsageRing>
      <View style={styles.meterStats}>
        <View style={[styles.meterStat, { backgroundColor: pal.iconTile }]}>
          <View style={[styles.meterDot, { backgroundColor: color }]} />
          <View style={styles.copy}>
            <Text style={[styles.meterStatLabel, { color: pal.muted, fontSize: fs(11) }]}>
              {usedLabel}
            </Text>
            <Text style={[styles.meterStatValue, { color: pal.fg, fontSize: fs(15) }]}>
              {formatCount(used)}
            </Text>
          </View>
        </View>
        <View style={[styles.meterStat, { backgroundColor: pal.iconTile }]}>
          <View style={[styles.meterDot, { backgroundColor: pal.track }]} />
          <View style={styles.copy}>
            <Text style={[styles.meterStatLabel, { color: pal.muted, fontSize: fs(11) }]}>
              {leftLabel}
            </Text>
            <Text style={[styles.meterStatValue, { color: pal.fg, fontSize: fs(15) }]}>
              {formatCount(remaining)}
            </Text>
          </View>
        </View>
      </View>
      {limit > 0 ? (
        <Text style={[styles.meterCap, { color: pal.muted, fontSize: fs(12) }]}>
          {`${formatCount(used)} / ${formatCount(limit)}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  meterBlock: { alignItems: "center", paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  meterStats: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
  meterStat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  meterDot: { width: 8, height: 8, borderRadius: 4 },
  copy: { flex: 1, minWidth: 0 },
  meterStatLabel: { ...morphFont, fontWeight: "500" },
  meterStatValue: { ...morphFont, fontWeight: "600", marginTop: 2 },
  meterPctBig: { ...morphFont, fontWeight: "700", letterSpacing: -1 },
  meterCap: { ...morphFont, marginTop: 12, marginBottom: 8 },
});
