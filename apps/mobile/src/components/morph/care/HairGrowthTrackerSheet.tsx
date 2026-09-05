import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { generateHairGrowthForecast } from "../../../api/care";
import { Skeleton } from "../../ui/Skeleton";
import { pickSelfieFromGallery } from "../../../lib/selfie";
import {
  countRecentCheckIns,
  loadHairGrowthTracker,
  saveHairGrowthTracker,
  type HairGrowthCheckIn,
  type HairGrowthDensity,
  type HairGrowthForecast,
  type HairGrowthTrackerState,
} from "../../../lib/morph-ai-care";
import type { MyCareProduct } from "../../../lib/morph-my-products";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Props = {
  myProducts: MyCareProduct[];
};

const DENSITY_OPTS: Array<{ id: HairGrowthDensity; label: string }> = [
  { id: "sparse", label: "Siyrak" },
  { id: "medium", label: "O'rtacha" },
  { id: "thick", label: "Qalin" },
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Number(n.toFixed(1));
}

function safeDate(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

function monthlyGrowthRate(checkIns: HairGrowthCheckIn[]): number {
  if (checkIns.length < 2) return 1.1;
  const rows = [...checkIns].sort((a, b) => safeDate(a.created_at) - safeDate(b.created_at));
  const first = rows[0];
  const last = rows[rows.length - 1];
  const deltaLen = last.length_cm - first.length_cm;
  const days = Math.max(1, (safeDate(last.created_at) - safeDate(first.created_at)) / (1000 * 60 * 60 * 24));
  const monthly = (deltaLen / days) * 30;
  return round1(clamp(monthly, 0.3, 3.2));
}

function nextMeasurementDays(checkIns: HairGrowthCheckIn[]): number {
  const last = checkIns[checkIns.length - 1];
  if (!last) return 7;
  const dueTs = safeDate(last.created_at) + 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((dueTs - Date.now()) / (1000 * 60 * 60 * 24)));
}

function densityBase(density: HairGrowthDensity | undefined): number {
  if (density === "thick") return 88;
  if (density === "medium") return 71;
  if (density === "sparse") return 54;
  return 66;
}

function healthScore(checkIns: HairGrowthCheckIn[]): number {
  const latest = checkIns[checkIns.length - 1];
  const densityScore = densityBase(latest?.density);
  const consistencyScore = clamp(Math.round((countRecentCheckIns(checkIns, 28) / 4) * 100), 20, 100);
  const routineScore = clamp(
    Math.round(
      (((checkIns.slice(-4).reduce((acc, row) => acc + row.products_used.length, 0) / Math.max(1, checkIns.slice(-4).length)) / 4) * 100),
    ),
    15,
    100,
  );
  return clamp(Math.round(densityScore * 0.5 + consistencyScore * 0.35 + routineScore * 0.15), 0, 100);
}

function statusColor(status: HairGrowthForecast["growth_rate_status"] | undefined): string {
  if (status === "EXCELLENT") return "#16A34A";
  if (status === "NORMAL") return "#2563EB";
  if (status === "NEEDS_IMPROVEMENT") return "#EA580C";
  return "#111111";
}

function statusLabel(status: HairGrowthForecast["growth_rate_status"] | undefined): string {
  if (status === "EXCELLENT") return "Excellent";
  if (status === "NORMAL") return "Normal";
  if (status === "NEEDS_IMPROVEMENT") return "Yaxshilash kerak";
  return "Hisoblanmoqda";
}

function fallbackForecast(
  currentLengthCm: number,
  checkInsCount: number,
  productsUsed: string[],
): HairGrowthForecast {
  const low = productsUsed.join(" ").toLowerCase();
  const hasActive =
    low.includes("minoxidil") ||
    low.includes("rosemary") ||
    low.includes("peptide") ||
    low.includes("massaj") ||
    low.includes("scalp");
  const baseline = 1 + (Math.min(4, checkInsCount) / 4) * 0.2;
  const boost = hasActive ? 0.35 + (Math.min(4, checkInsCount) / 4) * 0.2 : 0;
  const monthly = baseline + boost;
  const projected = round1(currentLengthCm + monthly * 3);
  return {
    projected_length_3_months: projected,
    growth_rate_status: monthly >= 1.45 ? "EXCELLENT" : monthly >= 1.0 ? "NORMAL" : "NEEDS_IMPROVEMENT",
    ai_commentary:
      monthly >= 1.45
        ? "Ajoyib! Rejimingiz barqaror va natija tezlashmoqda."
        : "Barqaror o'sish bor. Intizomni saqlasangiz natija yanada yaxshilanadi.",
    recommended_action: hasActive
      ? "Kelasi hafta ingredientli mahsulotlarni 4/4 rejimda davom ettiring."
      : "Haftasiga kamida 4 marta check-in va scalp massajni qo'shing.",
    updated_at: new Date().toISOString(),
  };
}

export function HairGrowthTrackerSheet({ myProducts }: Props) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [tracker, setTracker] = useState<HairGrowthTrackerState>({
    check_ins: [],
    forecast: null,
  });
  const [loading, setLoading] = useState(true);
  const [forecasting, setForecasting] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [lengthInput, setLengthInput] = useState("");
  const [density, setDensity] = useState<HairGrowthDensity>("medium");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(undefined);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState("p3");

  const chartWidth = Math.min(width - scale(50), scale(360));
  const chartHeight = verticalScale(200);
  const padTop = verticalScale(14);
  const padBottom = verticalScale(26);
  const padHorizontal = scale(10);
  const plotHeight = chartHeight - padTop - padBottom;
  const plotWidth = chartWidth - padHorizontal * 2;

  const routineOptions = useMemo(() => {
    const base = [
      "Minoxidil",
      "Rosemary Oil",
      "Peptide Serum",
      "Scalp Massage",
      "Special Shampoo",
      "Hair Oils",
      "Serum",
    ];
    const own = myProducts.map((p) => p.name).filter(Boolean).slice(0, 6);
    return [...new Set([...base, ...own])].slice(0, 10);
  }, [myProducts]);

  const checkIns = tracker.check_ins;
  const latest = checkIns[checkIns.length - 1];
  const currentLength = latest?.length_cm ?? 18;
  const growthRate = monthlyGrowthRate(checkIns);
  const health = healthScore(checkIns);
  const countdown = nextMeasurementDays(checkIns);
  const recentCount = countRecentCheckIns(checkIns, 28);

  const projectedLength3 = tracker.forecast?.projected_length_3_months ?? round1(currentLength + (growthRate + 0.2) * 3);
  const projectedDelta = round1((projectedLength3 - currentLength) / 3);

  const historyValues = useMemo(() => {
    const rows = checkIns.slice(-4).map((row) => row.length_cm);
    if (!rows.length) {
      return [round1(currentLength - growthRate * 3), round1(currentLength - growthRate * 2), round1(currentLength - growthRate), round1(currentLength)];
    }
    while (rows.length < 4) {
      rows.unshift(round1((rows[0] ?? currentLength) - growthRate));
    }
    return rows.map((v) => round1(Math.max(0.5, v)));
  }, [checkIns, currentLength, growthRate]);

  const projectedValues = useMemo(
    () => [
      round1(currentLength),
      round1(currentLength + projectedDelta),
      round1(currentLength + projectedDelta * 2),
      round1(projectedLength3),
    ],
    [currentLength, projectedDelta, projectedLength3],
  );

  const allY = [...historyValues, ...projectedValues];
  const minY = Math.max(0, Math.min(...allY) - 0.8);
  const maxY = Math.max(minY + 1.2, Math.max(...allY) + 0.8);

  const xFor = useCallback(
    (idx: number) => padHorizontal + (plotWidth / 6) * idx,
    [padHorizontal, plotWidth],
  );
  const yFor = useCallback(
    (v: number) => padTop + ((maxY - v) / (maxY - minY || 1)) * plotHeight,
    [maxY, minY, padTop, plotHeight],
  );

  const actualPath = useMemo(() => {
    const points = historyValues.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)} ${yFor(v)}`);
    return points.join(" ");
  }, [historyValues, xFor, yFor]);

  const projectedPath = useMemo(() => {
    const points = projectedValues.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i + 3)} ${yFor(v)}`);
    return points.join(" ");
  }, [projectedValues, xFor, yFor]);

  const allPoints = useMemo(
    () => [
      ...historyValues.map((v, i) => ({
        key: `a${i}`,
        value: v,
        label: i === 3 ? "Hozir" : `${3 - i} oy avval`,
        series: "actual" as const,
        x: xFor(i),
        y: yFor(v),
      })),
      ...projectedValues.map((v, i) => ({
        key: `p${i + 3}`,
        value: v,
        label: i === 0 ? "Hozir" : `${i}-oy`,
        series: "projected" as const,
        x: xFor(i + 3),
        y: yFor(v),
      })),
    ],
    [historyValues, projectedValues, xFor, yFor],
  );

  const selected = allPoints.find((row) => row.key === selectedPoint) ?? allPoints[allPoints.length - 1];

  const applyTracker = useCallback((next: HairGrowthTrackerState) => {
    setTracker(next);
    void saveHairGrowthTracker(next);
  }, []);

  const runForecast = useCallback(
    async (rows: HairGrowthCheckIn[], productsUsed: string[]) => {
      if (!rows.length) return;
      const latestRow = rows[rows.length - 1];
      const activeProducts = productsUsed.length ? productsUsed : latestRow.products_used;
      const checkInsCount = countRecentCheckIns(rows, 28);
      setForecasting(true);
      setForecastError(null);
      try {
        const forecast = await generateHairGrowthForecast({
          current_length_cm: latestRow.length_cm,
          check_ins_count: checkInsCount,
          products_used: activeProducts,
        });
        applyTracker({
          check_ins: rows,
          forecast: {
            projected_length_3_months: round1(forecast.projected_length_3_months),
            growth_rate_status: forecast.growth_rate_status,
            ai_commentary: forecast.ai_commentary,
            recommended_action: forecast.recommended_action,
            updated_at: new Date().toISOString(),
          },
        });
      } catch (e) {
        const fb = fallbackForecast(latestRow.length_cm, checkInsCount, activeProducts);
        applyTracker({ check_ins: rows, forecast: fb });
        setForecastError(e instanceof Error ? e.message : t("common.error", { defaultValue: "Xatolik" }));
      } finally {
        setForecasting(false);
      }
    },
    [applyTracker, t],
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const stored = await loadHairGrowthTracker();
        setTracker(stored);
        if (stored.check_ins.length && !stored.forecast) {
          const lastProducts = stored.check_ins[stored.check_ins.length - 1]?.products_used || [];
          void runForecast(stored.check_ins, lastProducts);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [runForecast]);

  const toggleRoutine = (name: string) => {
    setSelectedProducts((prev) => (prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]));
  };

  const saveCheckIn = async () => {
    const parsed = Number(lengthInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const row: HairGrowthCheckIn = {
      id: `${Date.now()}`,
      created_at: new Date().toISOString(),
      length_cm: round1(parsed),
      density,
      products_used: selectedProducts.slice(0, 12),
      photo_data_url: photoDataUrl,
    };
    const nextRows = [...tracker.check_ins, row]
      .sort((a, b) => safeDate(a.created_at) - safeDate(b.created_at))
      .slice(-24);
    applyTracker({ check_ins: nextRows, forecast: tracker.forecast });
    setModalOpen(false);
    setLengthInput("");
    setDensity("medium");
    setPhotoDataUrl(undefined);
    setSelectedProducts([]);
    await runForecast(nextRows, row.products_used);
  };

  const pickPhoto = async () => {
    const image = await pickSelfieFromGallery();
    if (image) setPhotoDataUrl(image);
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Skeleton height={verticalScale(190)} radius={moderateScale(24)} />
        <Skeleton height={verticalScale(150)} radius={moderateScale(20)} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {t("care.growthTracker.title", { defaultValue: "Hair Growth & Health Tracker" })}
          </Text>
          <Text style={styles.sub}>
            {t("care.growthTracker.sub", { defaultValue: "3 oylik progress va AI prognoz" })}
          </Text>
        </View>
        <Pressable style={styles.checkInBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.checkInBtnText}>Check-in</Text>
        </Pressable>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Current Length</Text>
          <Text style={styles.metricValue}>{round1(currentLength)} cm</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Monthly Growth</Text>
          <Text style={styles.metricValue}>+{round1(growthRate)} cm / oy</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Health Score</Text>
          <View style={styles.healthRow}>
            <View style={styles.ringWrap}>
              <Svg width={36} height={36}>
                <Circle cx={18} cy={18} r={14} stroke="#E6E0D4" strokeWidth={5} fill="none" />
                <Circle
                  cx={18}
                  cy={18}
                  r={14}
                  stroke="#111111"
                  strokeWidth={5}
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 14} ${2 * Math.PI * 14}`}
                  strokeDashoffset={(2 * Math.PI * 14) * (1 - health / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 18 18)"
                />
              </Svg>
              <Text style={styles.ringText}>{health}%</Text>
            </View>
          </View>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Next Measurement</Text>
          <Text style={styles.metricValueSmall}>
            {countdown === 0
              ? "Bugun check-in qiling"
              : `Keyingi o'lchovga ${countdown} kun qoldi`}
          </Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHead}>
          <Text style={styles.chartTitle}>Growth Analytics</Text>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor(tracker.forecast?.growth_rate_status)}1A` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor(tracker.forecast?.growth_rate_status) }]} />
            <Text style={[styles.statusText, { color: statusColor(tracker.forecast?.growth_rate_status) }]}>
              {statusLabel(tracker.forecast?.growth_rate_status)}
            </Text>
          </View>
        </View>

        <Svg width={chartWidth} height={chartHeight}>
          {[0, 1, 2, 3].map((idx) => {
            const y = padTop + (plotHeight / 3) * idx;
            return (
              <Line
                key={`grid-${idx}`}
                x1={padHorizontal}
                y1={y}
                x2={chartWidth - padHorizontal}
                y2={y}
                stroke="#E8E4DC"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          <Path d={actualPath} stroke="#111111" strokeWidth={2.4} fill="none" />
          <Path d={projectedPath} stroke="#6D28D9" strokeWidth={2.4} fill="none" strokeDasharray="6 6" />

          {allPoints.map((pt) => (
            <Circle
              key={pt.key}
              cx={pt.x}
              cy={pt.y}
              r={selected?.key === pt.key ? 5.4 : 4}
              fill={pt.series === "actual" ? "#111111" : "#6D28D9"}
              stroke="#fff"
              strokeWidth={selected?.key === pt.key ? 1.8 : 1.2}
              onPress={() => setSelectedPoint(pt.key)}
            />
          ))}
        </Svg>

        <View style={styles.xAxisRow}>
          {["M-3", "M-2", "M-1", "Current", "Month1", "Month2", "Month3"].map((label) => (
            <Text key={label} style={styles.axisLabel}>{label}</Text>
          ))}
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: "#111111" }]} />
            <Text style={styles.legendText}>Actual</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: "#6D28D9" }]} />
            <Text style={styles.legendText}>AI Projected</Text>
          </View>
        </View>

        {selected ? (
          <View style={styles.pointInfo}>
            <Text style={styles.pointInfoLabel}>
              {selected.series === "actual" ? "Actual trend" : "AI forecast"} · {selected.label}
            </Text>
            <Text style={styles.pointInfoValue}>{selected.value} cm</Text>
          </View>
        ) : null}

        {forecasting ? (
          <View style={styles.aiStateRow}>
            <ActivityIndicator size="small" color="#111111" />
            <Text style={styles.aiStateText}>
              {t("care.growthTracker.forecasting", { defaultValue: "AI prognoz yangilanmoqda..." })}
            </Text>
          </View>
        ) : null}

        {forecastError ? (
          <Pressable
            style={styles.aiErrorRow}
            onPress={() => void runForecast(checkIns, latest?.products_used || [])}
          >
            <Text style={styles.aiErrorText}>{forecastError}</Text>
            <Text style={styles.aiRetry}>Qayta urinish</Text>
          </Pressable>
        ) : null}

        <View style={styles.commentaryBox}>
          <Text style={styles.commentaryLabel}>Morf AI</Text>
          <Text style={styles.commentaryText}>
            {tracker.forecast?.ai_commentary || "Progressni davom ettiring — AI yaqin orada aniq prognoz beradi."}
          </Text>
          <Text style={styles.tipText}>
            Tip: {tracker.forecast?.recommended_action || "Kelasi hafta 4/4 check-in ritmini ushlang."}
          </Text>
        </View>
      </View>

      {checkIns.length ? (
        <View style={styles.historyCard}>
          <View style={styles.historyHead}>
            <Text style={styles.historyTitle}>Progress Album</Text>
            <Text style={styles.historySub}>{recentCount}/4 weekly check-in</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyRow}>
            {checkIns.slice(-8).reverse().map((row) => (
              <View key={row.id} style={styles.historyItem}>
                <View style={styles.historyPhotoWrap}>
                  {row.photo_data_url ? (
                    <Image source={{ uri: row.photo_data_url }} style={styles.historyPhoto} contentFit="cover" />
                  ) : (
                    <View style={[styles.historyPhoto, styles.historyPhotoFallback]}>
                      <Ionicons name="image-outline" size={16} color="#737373" />
                    </View>
                  )}
                </View>
                <Text style={styles.historyLen}>{row.length_cm} cm</Text>
                <Text style={styles.historyDate}>
                  {new Date(safeDate(row.created_at)).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Weekly Check-In</Text>
            <Text style={styles.modalSub}>Bugungi soch holatingizni kiriting</Text>

            <Text style={styles.fieldLabel}>Length (cm)</Text>
            <TextInput
              value={lengthInput}
              onChangeText={setLengthInput}
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="18.0"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.fieldLabel}>Hair Density / Scalp Condition</Text>
            <View style={styles.densityRow}>
              {DENSITY_OPTS.map((opt) => {
                const on = density === opt.id;
                return (
                  <Pressable key={opt.id} style={[styles.densityPill, on && styles.densityPillOn]} onPress={() => setDensity(opt.id)}>
                    <Text style={[styles.densityText, on && styles.densityTextOn]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Progress Photo</Text>
            <Pressable style={styles.photoPicker} onPress={() => void pickPhoto()}>
              {photoDataUrl ? (
                <Image source={{ uri: photoDataUrl }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={18} color="#111111" />
                  <Text style={styles.photoPlaceholderText}>Galereyadan yuklash</Text>
                </View>
              )}
            </Pressable>

            <Text style={styles.fieldLabel}>Current Routine Check</Text>
            <View style={styles.routineWrap}>
              {routineOptions.map((name) => {
                const on = selectedProducts.includes(name);
                return (
                  <Pressable key={name} style={[styles.routineChip, on && styles.routineChipOn]} onPress={() => toggleRoutine(name)}>
                    <Ionicons name={on ? "checkbox" : "square-outline"} size={14} color={on ? "#fff" : "#111"} />
                    <Text style={[styles.routineChipText, on && styles.routineChipTextOn]} numberOfLines={1}>
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[
                styles.saveBtn,
                (!Number.isFinite(Number(lengthInput.replace(",", "."))) || Number(lengthInput.replace(",", ".")) <= 0) && styles.saveBtnDisabled,
              ]}
              onPress={() => void saveCheckIn()}
              disabled={!Number.isFinite(Number(lengthInput.replace(",", "."))) || Number(lengthInput.replace(",", ".")) <= 0}
            >
              <Text style={styles.saveBtnText}>Saqlash va AI forecast</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: moderateScale(26),
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    padding: moderateScale(14),
    gap: moderateScale(12),
  },
  headRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(10) },
  title: { ...morphFont, fontSize: fontSize(16), fontWeight: "800", color: "#111111" },
  sub: { ...morphFont, marginTop: 2, fontSize: fontSize(12), color: "rgba(17,17,17,0.55)" },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4),
    backgroundColor: "#111111",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(12),
    borderRadius: 999,
  },
  checkInBtnText: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: "#FFFFFF" },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: moderateScale(8),
  },
  metricCard: {
    width: "48.5%",
    minHeight: verticalScale(86),
    borderRadius: moderateScale(16),
    backgroundColor: "#F6F3ED",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(11),
    justifyContent: "space-between",
  },
  metricLabel: { ...morphFont, fontSize: fontSize(10.5), fontWeight: "700", color: "rgba(17,17,17,0.45)" },
  metricValue: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", color: "#111111" },
  metricValueSmall: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#111111", lineHeight: fontSize(16) },
  healthRow: { flexDirection: "row", alignItems: "center" },
  ringWrap: { width: scale(38), height: scale(38), alignItems: "center", justifyContent: "center" },
  ringText: {
    ...morphFont,
    position: "absolute",
    fontSize: fontSize(9.5),
    fontWeight: "800",
    color: "#111111",
  },
  chartCard: {
    borderRadius: moderateScale(20),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.08)",
    backgroundColor: "#FCFBF9",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(10),
    gap: moderateScale(10),
  },
  chartHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: moderateScale(8) },
  chartTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "800", color: "#111111" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    borderRadius: 999,
    paddingHorizontal: scale(9),
    paddingVertical: verticalScale(5),
  },
  statusDot: { width: scale(6), height: scale(6), borderRadius: 99 },
  statusText: { ...morphFont, fontSize: fontSize(10.5), fontWeight: "700" },
  xAxisRow: { flexDirection: "row", justifyContent: "space-between" },
  axisLabel: { ...morphFont, fontSize: fontSize(9.5), fontWeight: "600", color: "rgba(17,17,17,0.45)" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(16) },
  legendItem: { flexDirection: "row", alignItems: "center", gap: moderateScale(6) },
  legendLine: { width: scale(20), height: 2, borderRadius: 99 },
  legendText: { ...morphFont, fontSize: fontSize(11), fontWeight: "600", color: "rgba(17,17,17,0.66)" },
  pointInfo: {
    borderRadius: moderateScale(12),
    backgroundColor: "#F3F1EC",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    gap: 2,
  },
  pointInfoLabel: { ...morphFont, fontSize: fontSize(11), color: "rgba(17,17,17,0.55)" },
  pointInfoValue: { ...morphFont, fontSize: fontSize(14), fontWeight: "800", color: "#111111" },
  aiStateRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(7) },
  aiStateText: { ...morphFont, fontSize: fontSize(11), color: "rgba(17,17,17,0.52)" },
  aiErrorRow: { borderRadius: moderateScale(12), backgroundColor: "#FEF2F2", padding: moderateScale(10), gap: 3 },
  aiErrorText: { ...morphFont, fontSize: fontSize(11.5), color: "#991B1B" },
  aiRetry: { ...morphFont, fontSize: fontSize(11.5), fontWeight: "700", color: "#111111" },
  commentaryBox: {
    borderRadius: moderateScale(14),
    backgroundColor: "#111111",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(11),
    gap: moderateScale(5),
  },
  commentaryLabel: {
    ...morphFont,
    fontSize: fontSize(10.5),
    fontWeight: "800",
    color: "rgba(255,255,255,0.72)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  commentaryText: { ...morphFont, fontSize: fontSize(12.5), color: "#FFFFFF", lineHeight: fontSize(17) },
  tipText: { ...morphFont, fontSize: fontSize(11), color: "rgba(255,255,255,0.8)" },
  historyCard: {
    borderRadius: moderateScale(16),
    backgroundColor: "#F6F3ED",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(10),
    gap: moderateScale(8),
  },
  historyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyTitle: { ...morphFont, fontSize: fontSize(13), fontWeight: "800", color: "#111" },
  historySub: { ...morphFont, fontSize: fontSize(11), color: "rgba(17,17,17,0.5)" },
  historyRow: { gap: moderateScale(8), paddingRight: scale(6) },
  historyItem: { width: scale(72), gap: 4 },
  historyPhotoWrap: {
    width: scale(72),
    height: scale(72),
    borderRadius: moderateScale(14),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  historyPhoto: { width: "100%", height: "100%" },
  historyPhotoFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#F1EFE9" },
  historyLen: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: "#111", textAlign: "center" },
  historyDate: { ...morphFont, fontSize: fontSize(9.5), color: "rgba(17,17,17,0.5)", textAlign: "center" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(8,8,8,0.4)",
  },
  modalSheet: {
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(24),
    gap: moderateScale(10),
    maxHeight: "92%",
  },
  modalHandle: {
    alignSelf: "center",
    width: scale(46),
    height: 4,
    borderRadius: 99,
    backgroundColor: "#D1D5DB",
    marginBottom: 2,
  },
  modalTitle: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", color: "#111111" },
  modalSub: { ...morphFont, marginTop: -2, fontSize: fontSize(12), color: "rgba(17,17,17,0.55)" },
  fieldLabel: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#111111", marginTop: 2 },
  input: {
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.12)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    ...morphFont,
    fontSize: fontSize(15),
    color: "#111111",
    backgroundColor: "#FAFAFA",
  },
  densityRow: { flexDirection: "row", gap: moderateScale(8) },
  densityPill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.15)",
    alignItems: "center",
    paddingVertical: verticalScale(9),
    backgroundColor: "#FFFFFF",
  },
  densityPillOn: { backgroundColor: "#111111", borderColor: "#111111" },
  densityText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: "#111111" },
  densityTextOn: { color: "#FFFFFF" },
  photoPicker: {
    borderRadius: moderateScale(14),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(17,17,17,0.22)",
    height: verticalScale(112),
    overflow: "hidden",
    backgroundColor: "#FAFAFA",
  },
  photoPreview: { width: "100%", height: "100%" },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: moderateScale(5) },
  photoPlaceholderText: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: "#111111" },
  routineWrap: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8) },
  routineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(5),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(17,17,17,0.14)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(7),
    backgroundColor: "#F9FAFB",
  },
  routineChipOn: { backgroundColor: "#111111", borderColor: "#111111" },
  routineChipText: { ...morphFont, fontSize: fontSize(11), fontWeight: "600", color: "#111111" },
  routineChipTextOn: { color: "#FFFFFF" },
  saveBtn: {
    marginTop: verticalScale(6),
    borderRadius: 999,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(14),
  },
  saveBtnDisabled: { backgroundColor: "#9CA3AF" },
  saveBtnText: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: "#FFFFFF" },
});
