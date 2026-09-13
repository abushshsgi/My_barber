import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeModal } from "../../ui/SafeModal";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { generateHairGrowthForecast } from "../../../api/care";
import { Skeleton } from "../../ui/Skeleton";
import { safeBottom } from "../../../lib/safe-area";
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
import { SOFT_PAPER } from "../../../theme/morph-appearance";
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

const C = SOFT_PAPER;
const DEFAULT_LENGTH_CM = 18;
const DEFAULT_MONTHLY_CM = 1.1;

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

function round2(n: number): number {
  return Number(n.toFixed(2));
}

function safeDate(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

/** Haqiqiy o'lchovlardan oy sur'ati — kamida 2 ta check-in. */
function measuredMonthlyRate(checkIns: HairGrowthCheckIn[]): number | null {
  if (checkIns.length < 2) return null;
  const rows = [...checkIns].sort((a, b) => safeDate(a.created_at) - safeDate(b.created_at));
  const first = rows[0];
  const last = rows[rows.length - 1];
  const days = Math.max(1, (safeDate(last.created_at) - safeDate(first.created_at)) / (1000 * 60 * 60 * 24));
  const monthly = ((last.length_cm - first.length_cm) / days) * 30;
  return round2(clamp(monthly, 0.3, 3.2));
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

function healthScore(checkIns: HairGrowthCheckIn[]): number | null {
  if (!checkIns.length) return null;
  const latest = checkIns[checkIns.length - 1];
  const densityScore = densityBase(latest?.density);
  const consistencyScore = clamp(Math.round((countRecentCheckIns(checkIns, 28) / 4) * 100), 20, 100);
  const recent = checkIns.slice(-4);
  const avgProducts =
    recent.reduce((acc, row) => acc + row.products_used.length, 0) / Math.max(1, recent.length);
  const routineScore = clamp(Math.round((avgProducts / 4) * 100), 15, 100);
  return clamp(Math.round(densityScore * 0.5 + consistencyScore * 0.35 + routineScore * 0.15), 0, 100);
}

function statusColor(status: HairGrowthForecast["growth_rate_status"] | undefined): string {
  if (status === "EXCELLENT") return "#15803D";
  if (status === "NORMAL") return C.fg;
  if (status === "NEEDS_IMPROVEMENT") return C.warn;
  return C.muted;
}

function statusLabel(status: HairGrowthForecast["growth_rate_status"] | undefined): string {
  if (status === "EXCELLENT") return "Ajoyib";
  if (status === "NORMAL") return "Normal";
  if (status === "NEEDS_IMPROVEMENT") return "Yaxshilash kerak";
  return "Kutilmoqda";
}

/**
 * Bitta manba: oy sur'ati va 3 oy prognoz doim mos.
 * projected = current + monthly * 3
 */
function resolveGrowthMetrics(
  currentLength: number,
  checkIns: HairGrowthCheckIn[],
  forecast: HairGrowthForecast | null,
): { monthlyCm: number; projected3Cm: number; rateSource: "measured" | "ai" | "default" } {
  const measured = measuredMonthlyRate(checkIns);

  if (forecast) {
    const aiMonthly =
      forecast.monthly_growth_cm != null && Number.isFinite(forecast.monthly_growth_cm)
        ? round2(clamp(forecast.monthly_growth_cm, 0.3, 2.5))
        : round2(clamp((forecast.projected_length_3_months - currentLength) / 3, 0.3, 2.5));
    // O'lchov bor bo'lsa — sur'at o'lchovdan; 3 oy nishon AI dan (qayta moslashtirilgan)
    if (measured != null) {
      return {
        monthlyCm: measured,
        projected3Cm: round1(currentLength + measured * 3),
        rateSource: "measured",
      };
    }
    return {
      monthlyCm: aiMonthly,
      projected3Cm: round1(currentLength + aiMonthly * 3),
      rateSource: "ai",
    };
  }

  if (measured != null) {
    return {
      monthlyCm: measured,
      projected3Cm: round1(currentLength + measured * 3),
      rateSource: "measured",
    };
  }

  return {
    monthlyCm: DEFAULT_MONTHLY_CM,
    projected3Cm: round1(currentLength + DEFAULT_MONTHLY_CM * 3),
    rateSource: "default",
  };
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
  const monthly = round2(baseline + boost);
  return {
    monthly_growth_cm: monthly,
    projected_length_3_months: round1(currentLengthCm + monthly * 3),
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
  const insets = useSafeAreaInsets();
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
  const [selectedPoint, setSelectedPoint] = useState("now");

  const chartWidth = width - scale(32);
  const chartHeight = verticalScale(150);
  const padTop = verticalScale(14);
  const padBottom = verticalScale(10);
  const padHorizontal = scale(6);
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
  const hasData = checkIns.length > 0;
  const currentLength = latest?.length_cm ?? DEFAULT_LENGTH_CM;
  const { monthlyCm: growthRate, projected3Cm: projectedLength3, rateSource } = resolveGrowthMetrics(
    currentLength,
    checkIns,
    tracker.forecast,
  );
  const health = healthScore(checkIns);
  const countdown = nextMeasurementDays(checkIns);
  const recentCount = countRecentCheckIns(checkIns, 28);
  const gain3 = round1(projectedLength3 - currentLength);

  const historyValues = useMemo(() => {
    const rows = checkIns.slice(-4).map((row) => row.length_cm);
    if (!rows.length) {
      return [
        round1(currentLength - growthRate * 3),
        round1(currentLength - growthRate * 2),
        round1(currentLength - growthRate),
        round1(currentLength),
      ];
    }
    while (rows.length < 4) {
      rows.unshift(round1((rows[0] ?? currentLength) - growthRate));
    }
    return rows.map((v) => round1(Math.max(0.5, v)));
  }, [checkIns, currentLength, growthRate]);

  // Prognoz nuqtalari: hozir + 1oy + 2oy + 3oy — bitta oy sur'ati bilan
  const projectedValues = useMemo(
    () => [
      round1(currentLength),
      round1(currentLength + growthRate),
      round1(currentLength + growthRate * 2),
      round1(currentLength + growthRate * 3),
    ],
    [currentLength, growthRate],
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
    return historyValues.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)} ${yFor(v)}`).join(" ");
  }, [historyValues, xFor, yFor]);

  const projectedPath = useMemo(() => {
    return projectedValues.map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i + 3)} ${yFor(v)}`).join(" ");
  }, [projectedValues, xFor, yFor]);

  const allPoints = useMemo(
    () => [
      ...historyValues.map((v, i) => ({
        key: i === 3 ? "now" : `a${i}`,
        value: v,
        label: i === 3 ? "Hozir" : `M-${3 - i}`,
        series: "actual" as const,
        x: xFor(i),
        y: yFor(v),
      })),
      ...projectedValues.slice(1).map((v, i) => ({
        key: `p${i + 1}`,
        value: v,
        label: `${i + 1}-oy`,
        series: "projected" as const,
        x: xFor(i + 4),
        y: yFor(v),
      })),
    ],
    [historyValues, projectedValues, xFor, yFor],
  );

  const selected = allPoints.find((row) => row.key === selectedPoint) ?? allPoints[3];

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
        const monthly =
          forecast.monthly_growth_cm != null && Number.isFinite(forecast.monthly_growth_cm)
            ? round2(clamp(forecast.monthly_growth_cm, 0.3, 2.5))
            : round2(
                clamp((forecast.projected_length_3_months - latestRow.length_cm) / 3, 0.3, 2.5),
              );
        applyTracker({
          check_ins: rows,
          forecast: {
            monthly_growth_cm: monthly,
            projected_length_3_months: round1(latestRow.length_cm + monthly * 3),
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

  const lengthValid =
    Number.isFinite(Number(lengthInput.replace(",", "."))) &&
    Number(lengthInput.replace(",", ".")) > 0;

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton height={verticalScale(160)} radius={moderateScale(20)} />
        <Skeleton height={verticalScale(56)} radius={moderateScale(14)} />
        <Skeleton height={verticalScale(200)} radius={moderateScale(18)} />
      </View>
    );
  }

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Asosiy panel — uzunlik + prognoz bir qator */}
        <View style={styles.hero}>
          <View style={styles.heroMain}>
            <Text style={styles.heroEyebrow}>
              {t("care.growthTracker.currentLength", { defaultValue: "Joriy uzunlik" })}
            </Text>
            <View style={styles.heroValueRow}>
              <Text style={styles.heroValue}>{round1(currentLength)}</Text>
              <Text style={styles.heroUnit}>cm</Text>
            </View>
            {!hasData ? (
              <Text style={styles.heroHint}>Namuna qiymat — check-in qiling</Text>
            ) : null}
          </View>

          <View style={styles.heroSide}>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor(tracker.forecast?.growth_rate_status)}18` }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor(tracker.forecast?.growth_rate_status) }]} />
              <Text style={[styles.statusText, { color: statusColor(tracker.forecast?.growth_rate_status) }]}>
                {forecasting ? "Hisoblanmoqda" : statusLabel(tracker.forecast?.growth_rate_status)}
              </Text>
            </View>
            <Text style={styles.sideLabel}>3 oyda</Text>
            <Text style={styles.sideValue}>{projectedLength3} cm</Text>
            <Text style={styles.sideDelta}>+{gain3} cm · +{round1(growthRate)}/oy</Text>
          </View>
        </View>

        {/* Metrikalar — vertikal ro'yxat */}
        <View style={styles.metricsCard}>
          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <Ionicons name="pulse-outline" size={16} color={C.fg} />
            </View>
            <View style={styles.metricBody}>
              <Text style={styles.metricLabel}>
                {t("care.growthTracker.health", { defaultValue: "Sog'liq indeksi" })}
              </Text>
              <Text style={styles.metricHint}>
                {health == null
                  ? "Check-in kerak"
                  : rateSource === "measured"
                    ? "O'lchov asosida"
                    : "AI + rejim"}
              </Text>
            </View>
            <Text style={styles.metricValue}>{health == null ? "—" : `${health}%`}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <Ionicons name="calendar-outline" size={16} color={C.fg} />
            </View>
            <View style={styles.metricBody}>
              <Text style={styles.metricLabel}>
                {t("care.growthTracker.nextCheck", { defaultValue: "Keyingi o'lchov" })}
              </Text>
              <Text style={styles.metricHint}>Har 7 kunda</Text>
            </View>
            <Text style={styles.metricValue}>{countdown === 0 ? "Bugun" : `${countdown} kun`}</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricRow}>
            <View style={styles.metricIcon}>
              <Ionicons name="checkmark-done-outline" size={16} color={C.fg} />
            </View>
            <View style={styles.metricBody}>
              <Text style={styles.metricLabel}>
                {t("care.growthTracker.weekly", { defaultValue: "28 kunlik ritm" })}
              </Text>
              <Text style={styles.metricHint}>Maqsad: 4 check-in</Text>
            </View>
            <Text style={styles.metricValue}>{recentCount}/4</Text>
          </View>
        </View>

        {/* Grafik */}
        <View style={styles.chartCard}>
          <View style={styles.chartHead}>
            <Text style={styles.chartTitle}>
              {t("care.growthTracker.analytics", { defaultValue: "O'sish chizig'i" })}
            </Text>
            {selected ? (
              <View style={styles.chartBadge}>
                <Text style={styles.chartBadgeText}>
                  {selected.label}: {selected.value} cm
                </Text>
              </View>
            ) : null}
          </View>

          <Svg width={chartWidth} height={chartHeight}>
            {[0, 1, 2].map((idx) => {
              const y = padTop + (plotHeight / 2) * idx;
              return (
                <Line
                  key={`g-${idx}`}
                  x1={padHorizontal}
                  y1={y}
                  x2={chartWidth - padHorizontal}
                  y2={y}
                  stroke={C.track}
                  strokeWidth={1}
                />
              );
            })}
            <Line
              x1={xFor(3)}
              y1={padTop}
              x2={xFor(3)}
              y2={chartHeight - padBottom}
              stroke={C.line}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Path d={actualPath} stroke={C.fg} strokeWidth={2.5} fill="none" strokeLinecap="round" />
            <Path
              d={projectedPath}
              stroke={C.muted}
              strokeWidth={2}
              fill="none"
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
            {allPoints.map((pt) => (
              <Circle
                key={pt.key}
                cx={pt.x}
                cy={pt.y}
                r={selected?.key === pt.key ? 5.5 : 3.5}
                fill={pt.series === "actual" ? C.fg : C.muted}
                stroke={C.card}
                strokeWidth={2}
                onPress={() => setSelectedPoint(pt.key)}
              />
            ))}
          </Svg>

          <View style={styles.xAxisRow}>
            {["M-3", "M-2", "M-1", "Hozir", "1", "2", "3"].map((label) => (
              <Text key={label} style={[styles.axisLabel, label === "Hozir" && styles.axisNow]}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: C.fg }]} />
              <Text style={styles.legendText}>Haqiqiy</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, styles.legendDash]} />
              <Text style={styles.legendText}>Prognoz (+{round1(growthRate)} cm/oy)</Text>
            </View>
          </View>

          {forecasting ? (
            <View style={styles.aiStateRow}>
              <ActivityIndicator size="small" color={C.fg} />
              <Text style={styles.aiStateText}>AI prognoz yangilanmoqda…</Text>
            </View>
          ) : null}

          {forecastError ? (
            <Pressable
              style={styles.aiErrorRow}
              onPress={() => void runForecast(checkIns, latest?.products_used || [])}
            >
              <Text style={styles.aiErrorText} numberOfLines={2}>
                {forecastError}
              </Text>
              <Text style={styles.aiRetry}>Qayta</Text>
            </Pressable>
          ) : null}
        </View>

        {/* AI */}
        <View style={styles.aiCard}>
          <View style={styles.aiTop}>
            <Ionicons name="sparkles" size={14} color={C.fg} />
            <Text style={styles.aiBadgeText}>Morf AI</Text>
          </View>
          <Text style={styles.aiCommentary}>
            {tracker.forecast?.ai_commentary ||
              (hasData
                ? "Prognoz tayyorlanmoqda."
                : "Birinchi check-indan keyin AI aniq prognoz beradi.")}
          </Text>
          <Text style={styles.tipText}>
            {tracker.forecast?.recommended_action || "Kelasi hafta 4/4 check-in ritmini ushlang."}
          </Text>
        </View>

        {/* Tarix — gorizontal */}
        {checkIns.length ? (
          <View style={styles.historyBlock}>
            <Text style={styles.historyTitle}>
              {t("care.growthTracker.timeline", { defaultValue: "So'nggi o'lchovlar" })}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyStrip}>
              {checkIns
                .slice(-8)
                .reverse()
                .map((row) => (
                  <View key={row.id} style={styles.historyCard}>
                    {row.photo_data_url ? (
                      <Image source={{ uri: row.photo_data_url }} style={styles.historyPhoto} contentFit="cover" />
                    ) : (
                      <View style={[styles.historyPhoto, styles.historyPhotoEmpty]}>
                        <Ionicons name="cut-outline" size={18} color={C.muted} />
                      </View>
                    )}
                    <Text style={styles.historyLen}>{row.length_cm} cm</Text>
                    <Text style={styles.historyDate}>
                      {new Date(safeDate(row.created_at)).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={26} color={C.muted} />
            <Text style={styles.emptyTitle}>
              {t("care.growthTracker.emptyTitle", { defaultValue: "Hali check-in yo'q" })}
            </Text>
            <Text style={styles.emptySub}>
              {t("care.growthTracker.emptySub", {
                defaultValue: "Uzunlikni kiriting — sur'at va 3 oy prognoz avtomatik hisoblanadi.",
              })}
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Pastki CTA — FAB o'rniga */}
      <View style={[styles.ctaBar, { paddingBottom: safeBottom(insets.bottom, 8), paddingHorizontal: scale(16) }]}>
        <Pressable style={styles.ctaBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add-circle-outline" size={20} color={C.card} />
          <Text style={styles.ctaText}>
            {t("care.growthTracker.checkIn", { defaultValue: "Yangi check-in" })}
          </Text>
        </Pressable>
      </View>

      <SafeModal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)} />
          <View style={[styles.modalSheet, { paddingBottom: safeBottom(insets.bottom, 12) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {t("care.growthTracker.modalTitle", { defaultValue: "Haftalik check-in" })}
            </Text>
            <Text style={styles.modalSub}>
              {t("care.growthTracker.modalSub", { defaultValue: "Bugungi soch holatingizni kiriting" })}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.fieldLabel}>
                {t("care.growthTracker.lengthField", { defaultValue: "Uzunlik (cm)" })}
              </Text>
              <TextInput
                value={lengthInput}
                onChangeText={setLengthInput}
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="18.0"
                placeholderTextColor={C.muted}
              />

              <Text style={styles.fieldLabel}>
                {t("care.growthTracker.densityField", { defaultValue: "Zichlik / bosh terisi" })}
              </Text>
              <View style={styles.densityRow}>
                {DENSITY_OPTS.map((opt) => {
                  const on = density === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.densityPill, on && styles.densityPillOn]}
                      onPress={() => setDensity(opt.id)}
                    >
                      <Text style={[styles.densityText, on && styles.densityTextOn]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>
                {t("care.growthTracker.photoField", { defaultValue: "Progress fotosi" })}
              </Text>
              <Pressable style={styles.photoPicker} onPress={() => void pickPhoto()}>
                {photoDataUrl ? (
                  <Image source={{ uri: photoDataUrl }} style={styles.photoPreview} contentFit="cover" />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={22} color={C.muted} />
                    <Text style={styles.photoPlaceholderText}>Galereyadan yuklash</Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.fieldLabel}>
                {t("care.growthTracker.routineField", { defaultValue: "Joriy rejim" })}
              </Text>
              <View style={styles.routineWrap}>
                {routineOptions.map((name) => {
                  const on = selectedProducts.includes(name);
                  return (
                    <Pressable
                      key={name}
                      style={[styles.routineChip, on && styles.routineChipOn]}
                      onPress={() => toggleRoutine(name)}
                    >
                      <Text style={[styles.routineChipText, on && styles.routineChipTextOn]} numberOfLines={1}>
                        {name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              style={[styles.saveBtn, !lengthValid && styles.saveBtnDisabled]}
              onPress={() => void saveCheckIn()}
              disabled={!lengthValid}
            >
              <Text style={styles.saveBtnText}>
                {t("care.growthTracker.save", { defaultValue: "Saqlash va AI prognoz" })}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeModal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { gap: moderateScale(10), paddingTop: verticalScale(4) },
  scrollContent: { paddingTop: verticalScale(4), gap: moderateScale(12), paddingBottom: verticalScale(8) },

  hero: {
    flexDirection: "row",
    backgroundColor: C.fg,
    borderRadius: moderateScale(22),
    padding: moderateScale(18),
    gap: moderateScale(12),
    minHeight: verticalScale(132),
  },
  heroMain: { flex: 1, justifyContent: "center", gap: 2 },
  heroEyebrow: {
    ...morphFont,
    fontSize: fontSize(11),
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroValueRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 2 },
  heroValue: {
    ...morphFont,
    fontSize: fontSize(48),
    fontWeight: "800",
    color: "#fff",
    lineHeight: fontSize(52),
  },
  heroUnit: {
    ...morphFont,
    fontSize: fontSize(15),
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
    marginBottom: verticalScale(8),
  },
  heroHint: {
    ...morphFont,
    fontSize: fontSize(11),
    color: "rgba(255,255,255,0.45)",
    marginTop: 4,
  },
  heroSide: {
    width: scale(118),
    borderRadius: moderateScale(16),
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: moderateScale(12),
    justifyContent: "center",
    gap: 3,
  },
  statusPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    marginBottom: 4,
  },
  statusDot: { width: 5, height: 5, borderRadius: 99 },
  statusText: { ...morphFont, fontSize: fontSize(9.5), fontWeight: "700" },
  sideLabel: { ...morphFont, fontSize: fontSize(10), color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  sideValue: { ...morphFont, fontSize: fontSize(20), fontWeight: "800", color: "#fff" },
  sideDelta: { ...morphFont, fontSize: fontSize(10.5), fontWeight: "600", color: "rgba(255,255,255,0.7)" },

  metricsCard: {
    backgroundColor: C.card,
    borderRadius: moderateScale(18),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(4),
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(10),
    paddingVertical: verticalScale(12),
  },
  metricIcon: {
    width: scale(34),
    height: scale(34),
    borderRadius: moderateScale(10),
    backgroundColor: C.cardStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  metricBody: { flex: 1, minWidth: 0 },
  metricLabel: { ...morphFont, fontSize: fontSize(13), fontWeight: "700", color: C.fg },
  metricHint: { ...morphFont, fontSize: fontSize(11), color: C.muted, marginTop: 1 },
  metricValue: { ...morphFont, fontSize: fontSize(15), fontWeight: "800", color: C.fg },
  metricDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginLeft: scale(44) },

  chartCard: {
    backgroundColor: C.card,
    borderRadius: moderateScale(18),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: moderateScale(14),
    gap: moderateScale(6),
  },
  chartHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  chartTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "800", color: C.fg },
  chartBadge: {
    backgroundColor: C.cardStrong,
    borderRadius: 999,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  chartBadgeText: { ...morphFont, fontSize: fontSize(11), fontWeight: "700", color: C.fg },
  xAxisRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },
  axisLabel: { ...morphFont, fontSize: fontSize(9), fontWeight: "600", color: C.muted, width: scale(36), textAlign: "center" },
  axisNow: { color: C.fg, fontWeight: "800" },
  legendRow: { flexDirection: "row", gap: moderateScale(14), marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLine: { width: scale(14), height: 3, borderRadius: 2 },
  legendDash: { backgroundColor: C.muted, opacity: 0.7 },
  legendText: { ...morphFont, fontSize: fontSize(11), fontWeight: "600", color: C.muted },
  aiStateRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 4 },
  aiStateText: { ...morphFont, fontSize: fontSize(11), color: C.muted },
  aiErrorRow: {
    marginTop: 4,
    borderRadius: moderateScale(12),
    backgroundColor: `${C.destructive}12`,
    padding: moderateScale(10),
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiErrorText: { ...morphFont, flex: 1, fontSize: fontSize(11), color: C.destructive },
  aiRetry: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: C.fg },

  aiCard: {
    backgroundColor: C.cardStrong,
    borderRadius: moderateScale(18),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    padding: moderateScale(14),
    gap: moderateScale(8),
  },
  aiTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  aiBadgeText: {
    ...morphFont,
    fontSize: fontSize(10),
    fontWeight: "800",
    color: C.fg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiCommentary: { ...morphFont, fontSize: fontSize(13.5), fontWeight: "600", color: C.fg, lineHeight: fontSize(20) },
  tipText: { ...morphFont, fontSize: fontSize(12), color: C.muted, lineHeight: fontSize(17) },

  historyBlock: { gap: moderateScale(8) },
  historyTitle: { ...morphFont, fontSize: fontSize(14), fontWeight: "800", color: C.fg, paddingHorizontal: 2 },
  historyStrip: { gap: moderateScale(10), paddingRight: scale(8) },
  historyCard: {
    width: scale(88),
    backgroundColor: C.card,
    borderRadius: moderateScale(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    overflow: "hidden",
    paddingBottom: verticalScale(8),
  },
  historyPhoto: { width: "100%", height: scale(72), backgroundColor: C.cardStrong },
  historyPhotoEmpty: { alignItems: "center", justifyContent: "center" },
  historyLen: {
    ...morphFont,
    fontSize: fontSize(13),
    fontWeight: "800",
    color: C.fg,
    marginTop: verticalScale(6),
    paddingHorizontal: scale(8),
  },
  historyDate: {
    ...morphFont,
    fontSize: fontSize(10),
    color: C.muted,
    paddingHorizontal: scale(8),
    marginTop: 1,
  },

  emptyCard: {
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.line,
    paddingVertical: verticalScale(28),
    paddingHorizontal: scale(20),
    alignItems: "center",
    gap: moderateScale(6),
    backgroundColor: C.card,
  },
  emptyTitle: { ...morphFont, fontSize: fontSize(15), fontWeight: "800", color: C.fg },
  emptySub: {
    ...morphFont,
    fontSize: fontSize(12),
    color: C.muted,
    textAlign: "center",
    lineHeight: fontSize(17),
  },

  bottomSpacer: { height: verticalScale(64) },
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: verticalScale(8),
    backgroundColor: `${C.bg}F2`,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: moderateScale(8),
    backgroundColor: C.fg,
    borderRadius: moderateScale(16),
    paddingVertical: verticalScale(15),
  },
  ctaText: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: C.card },

  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(8,8,8,0.4)" },
  modalSheet: {
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    backgroundColor: C.card,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(10),
    maxHeight: "92%",
  },
  modalHandle: {
    alignSelf: "center",
    width: scale(46),
    height: 4,
    borderRadius: 99,
    backgroundColor: C.track,
    marginBottom: verticalScale(10),
  },
  modalTitle: { ...morphFont, fontSize: fontSize(18), fontWeight: "800", color: C.fg },
  modalSub: { ...morphFont, marginTop: 2, fontSize: fontSize(12), color: C.muted, marginBottom: verticalScale(8) },
  modalScroll: { gap: moderateScale(8), paddingBottom: verticalScale(8) },
  fieldLabel: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: C.fg, marginTop: verticalScale(4) },
  input: {
    borderRadius: moderateScale(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    ...morphFont,
    fontSize: fontSize(16),
    color: C.fg,
    backgroundColor: C.cardStrong,
  },
  densityRow: { flexDirection: "row", gap: moderateScale(8) },
  densityPill: {
    flex: 1,
    borderRadius: moderateScale(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    alignItems: "center",
    paddingVertical: verticalScale(11),
    backgroundColor: C.cardStrong,
  },
  densityPillOn: { backgroundColor: C.fg, borderColor: C.fg },
  densityText: { ...morphFont, fontSize: fontSize(12), fontWeight: "700", color: C.fg },
  densityTextOn: { color: C.card },
  photoPicker: {
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.line,
    height: verticalScale(120),
    overflow: "hidden",
    backgroundColor: C.cardStrong,
  },
  photoPreview: { width: "100%", height: "100%" },
  photoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: moderateScale(6) },
  photoPlaceholderText: { ...morphFont, fontSize: fontSize(12), fontWeight: "600", color: C.muted },
  routineWrap: { flexDirection: "row", flexWrap: "wrap", gap: moderateScale(8) },
  routineChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    backgroundColor: C.cardStrong,
  },
  routineChipOn: { backgroundColor: C.fg, borderColor: C.fg },
  routineChipText: { ...morphFont, fontSize: fontSize(11), fontWeight: "600", color: C.fg },
  routineChipTextOn: { color: C.card },
  saveBtn: {
    marginTop: verticalScale(8),
    borderRadius: moderateScale(16),
    backgroundColor: C.fg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(15),
  },
  saveBtnDisabled: { backgroundColor: C.track },
  saveBtnText: { ...morphFont, fontSize: fontSize(14), fontWeight: "700", color: C.card },
});
