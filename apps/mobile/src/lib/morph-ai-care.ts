import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  CareProduct,
  HairColorStatus,
  HairCondition,
  HairTexture,
} from "../api/care";

export type RoutineSlot = "morning" | "evening" | "weekly";

export type RoutineTask = {
  id: string;
  title: string;
  subtitle: string;
  icon: "water" | "flask" | "sparkles" | "shield" | "leaf" | "cut";
  productHint?: string;
  productId?: number;
  productName?: string;
  timeHint?: string;
  time?: string;
  durationMin?: number;
  imageUrl?: string | null;
  usageHow?: string;
  brand?: string;
  category?: string;
  slot?: RoutineSlot;
};

export type CareQuizAnswers = {
  condition: HairCondition | "";
  texture: HairTexture | "";
  colorStatus: HairColorStatus | "";
};

export function isCareQuizComplete(
  q: CareQuizAnswers | null | undefined,
): q is CareQuizAnswers & {
  condition: HairCondition;
  texture: HairTexture;
  colorStatus: HairColorStatus;
} {
  return Boolean(q?.condition && q?.texture && q?.colorStatus);
}

/** Foydalanuvchi tanlagan parvarish oynasi (HH:MM). */
export type CareSchedulePrefs = {
  morningTime: string;
  eveningTime: string;
};

export const MORNING_TIME_OPTIONS = ["06:30", "07:00", "07:30", "08:00", "09:00"] as const;
export const EVENING_TIME_OPTIONS = ["20:00", "20:30", "21:00", "21:30", "22:00"] as const;

const CARE_SCHEDULE_KEY = "mysaloon.morphAi.careSchedule";

function isClock(v: string | undefined | null): v is string {
  return !!v && /^\d{1,2}:\d{2}$/.test(v.trim());
}

export async function loadCareSchedule(): Promise<CareSchedulePrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(CARE_SCHEDULE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareSchedulePrefs;
    if (!isClock(parsed?.morningTime) || !isClock(parsed?.eveningTime)) return null;
    return {
      morningTime: normalizeClock(parsed.morningTime),
      eveningTime: normalizeClock(parsed.eveningTime),
    };
  } catch {
    return null;
  }
}

export async function saveCareSchedule(prefs: CareSchedulePrefs): Promise<void> {
  await AsyncStorage.setItem(
    CARE_SCHEDULE_KEY,
    JSON.stringify({
      morningTime: normalizeClock(prefs.morningTime),
      eveningTime: normalizeClock(prefs.eveningTime),
    }),
  );
}

export function normalizeClock(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return raw.trim();
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function clockToMin(t: string): number {
  const [h, m] = normalizeClock(t).split(":").map(Number);
  return h * 60 + m;
}

function minToClock(total: number): string {
  const x = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
}

/** Birinchi qadamni `anchor` ga siljitadi, oralig‘lar saqlanadi. */
export function shiftRoutineTimes<T extends { time?: string; timeHint?: string }>(
  tasks: T[],
  anchor: string | undefined | null,
): T[] {
  if (!tasks.length || !isClock(anchor)) return tasks;
  const first = tasks.map((t) => t.time).find((t) => isClock(t));
  if (!first) {
    let base = clockToMin(anchor);
    return tasks.map((t, i) => {
      const clock = minToClock(base + i * 8);
      const label = (t.timeHint || "").replace(/^\d{1,2}:\d{2}\s*·\s*/, "").trim();
      return {
        ...t,
        time: clock,
        timeHint: label ? `${clock} · ${label}` : clock,
      };
    });
  }
  const delta = clockToMin(anchor) - clockToMin(first);
  return tasks.map((t) => {
    if (!isClock(t.time)) return t;
    const clock = minToClock(clockToMin(t.time) + delta);
    const rest = (t.timeHint || "").replace(/^\d{1,2}:\d{2}/, clock).trim();
    return {
      ...t,
      time: clock,
      timeHint: rest.includes(clock) ? rest : `${clock}${t.timeHint ? ` · ${t.timeHint.replace(/^\d{1,2}:\d{2}\s*·\s*/, "")}` : ""}`.trim(),
    };
  });
}

export type CarePlanProduct = {
  name: string;
  role: string;
  tip: string;
};

export type CarePlan = {
  condition: HairCondition;
  texture: HairTexture;
  colorStatus: HairColorStatus;
  summary: string;
  weekly: { day: string; task: string }[];
  products: CarePlanProduct[];
  stylingTips: string[];
  avoid: string[];
};

const CARE_QUIZ_KEY = "mysaloon.morphAi.careQuiz";

export async function loadCareQuiz(): Promise<CareQuizAnswers | null> {
  try {
    const raw = await AsyncStorage.getItem(CARE_QUIZ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareQuizAnswers;
    if (!parsed?.condition || !parsed?.texture || !parsed?.colorStatus) return null;
    return {
      condition: parsed.condition,
      texture: parsed.texture,
      colorStatus: parsed.colorStatus,
    };
  } catch {
    return null;
  }
}

export async function saveCareQuiz(answers: CareQuizAnswers) {
  await AsyncStorage.setItem(
    CARE_QUIZ_KEY,
    JSON.stringify({
      condition: answers.condition,
      texture: answers.texture,
      colorStatus: answers.colorStatus,
    }),
  );
}

function buildProducts(
  condition: HairCondition,
  colorStatus: HairColorStatus,
): CarePlanProduct[] {
  let base: CarePlanProduct[];
  if (condition === "oily") {
    base = [
      { name: "Balanslash shampuni", role: "Yuvish", tip: "Faqat ildizga." },
      { name: "Yengil konditsioner", role: "Uchlar", tip: "1–2 daqiqa, keyin yuving." },
      { name: "Volume cream", role: "Styling", tip: "No‘xatdek, nam sochga." },
    ];
  } else if (condition === "dry") {
    base = [
      { name: "Namlantiruvchi shampun", role: "Yuvish", tip: "Iliq suvda." },
      { name: "Repair maska", role: "Parvarish", tip: "Haftada 1 × 10 daqiqa." },
      { name: "Leave-in krem", role: "Kundalik", tip: "Uchlarga yupqa qatlam." },
    ];
  } else if (condition === "damaged") {
    base = [
      { name: "Repair shampun", role: "Yuvish", tip: "Yumshoq massaj." },
      { name: "Protein maska", role: "Parvarish", tip: "Haftada 1 marta." },
      { name: "Issiqlik himoyasi", role: "Himoya", tip: "Fen oldidan." },
    ];
  } else {
    base = [
      { name: "Yumshoq shampun", role: "Yuvish", tip: "2–3 kunda bir." },
      { name: "Konditsioner", role: "Parvarish", tip: "Uchlardan o‘rtagacha." },
      { name: "Matte paste", role: "Styling", tip: "Quruq sochga, kam miqdor." },
    ];
  }
  if (colorStatus === "bleached") {
    base.push({ name: "Purple shampun", role: "Rang", tip: "Haftada 1 marta." });
  } else if (colorStatus === "colored") {
    base.push({ name: "Color-safe shampun", role: "Rang", tip: "Sulfatsiz tur." });
  }
  return base;
}

function buildStylingTips(texture: HairTexture, condition: HairCondition): string[] {
  const tips: string[] = [
    "Paste/gel ni avval kaftlarda eriting.",
    "Kam mahsulot bilan boshlang.",
  ];
  if (texture === "curly") tips.push("Diffuzer yoki barmoq — taroq emas.");
  else if (texture === "wavy") tips.push("Yengil cream, pastga qarab siqing.");
  else tips.push("Matte paste — tartib; pomade — slick.");
  if (condition === "oily") tips.push("Og‘ir oil va thick pomade dan saqlaning.");
  else if (condition === "damaged" || condition === "dry") tips.push("Fen past/o‘rta rejimda.");
  return tips.slice(0, 4);
}

export function defaultQuiz(): CareQuizAnswers {
  return { condition: "", texture: "", colorStatus: "" };
}

export function buildCarePlan(quiz: CareQuizAnswers): CarePlan {
  const condition: HairCondition = quiz.condition || "normal";
  const texture: HairTexture = quiz.texture || "straight";
  const colorStatus: HairColorStatus = quiz.colorStatus || "natural";
  const summaryByCondition: Record<HairCondition, string> = {
    oily: "Ildiz tez yog‘lanadi. Yengil yuvish va kam mahsulot.",
    dry: "Uchlar quruqroq. Namlantirish + leave-in.",
    normal: "Balans yaxshi. Oddiy rejim va yengil styling.",
    damaged: "Uchlar sinuvchan. Repair + issiqlik himoyasi.",
  };
  let colorNote = "";
  if (colorStatus === "bleached") colorNote = " Ochilgan soch: tonal shampun.";
  else if (colorStatus === "colored") colorNote = " Bo‘yalgan soch: color-safe.";

  let weekly: { day: string; task: string }[];
  if (condition === "oily") {
    weekly = [
      { day: "Du", task: "Yengil shampun" },
      { day: "Chor", task: "Faqat ildiz" },
      { day: "Jum", task: "Yuvish + leave-in" },
      { day: "Yak", task: "Scalp massaj" },
    ];
  } else if (condition === "dry" || condition === "damaged") {
    weekly = [
      { day: "Du", task: "Namlantiruvchi shampun" },
      { day: "Chor", task: "Deep maska" },
      { day: "Jum", task: "Yuvish + leave-in" },
      { day: "Yak", task: "Uchlarga oil" },
    ];
  } else {
    weekly = [
      { day: "Du", task: "Oddiy yuvish" },
      { day: "Chor", task: "Conditioning" },
      { day: "Jum", task: "Yuvish + styling" },
      { day: "Yak", task: "Maska (ixtiyoriy)" },
    ];
  }

  let avoid: string[];
  if (condition === "oily") avoid = ["Har kuni oil", "Issiq suv", "Og‘ir serum"];
  else if (condition === "dry" || condition === "damaged")
    avoid = ["Har kuni shampun", "Issiq fen", "Qattiq bog‘ich"];
  else avoid = ["Har kuni yuvish", "Ortiqcha wax", "Quruq tarash"];
  if (colorStatus !== "natural") avoid.push("Sulfatli shampun");

  return {
    condition,
    texture,
    colorStatus,
    summary: summaryByCondition[condition] + colorNote,
    weekly,
    products: buildProducts(condition, colorStatus),
    stylingTips: buildStylingTips(texture, condition),
    avoid,
  };
}

export function estimateProductFit(product: CareProduct, quiz: CareQuizAnswers): number {
  if (typeof product.match_percent === "number") {
    return Math.max(0, Math.min(100, Math.round(product.match_percent)));
  }
  const tags = [
    quiz.condition,
    quiz.texture,
    quiz.colorStatus === "natural" ? "natural" : quiz.colorStatus,
  ];
  const suitable = product.suitable_for || [];
  const notSuitable = product.not_suitable_for || [];
  let score = 72;
  for (const tag of tags) {
    if (suitable.includes(tag)) score += 8;
    if (notSuitable.includes(tag)) score -= 14;
  }
  return Math.max(42, Math.min(98, score));
}

export function buildDailyRoutine(
  quiz: CareQuizAnswers,
  slot: RoutineSlot,
  myProducts?: { id: number; name: string; category: string }[],
  schedule?: CareSchedulePrefs | null,
): RoutineTask[] {
  const { condition, texture, colorStatus } = quiz;

  const pick = (hint?: string): { productId?: number; productName?: string } => {
    if (!hint || !myProducts?.length) return {};
    const aliases =
      hint === "balsam" || hint === "conditioner"
        ? ["balsam", "conditioner"]
        : [hint];
    const hit = myProducts.find((p) =>
      aliases.includes((p.category || "").toLowerCase()),
    );
    return hit ? { productId: hit.id, productName: hit.name } : {};
  };

  const withProduct = (task: RoutineTask): RoutineTask => {
    const matched = pick(task.productHint);
    if (!matched.productName) return task;
    return {
      ...task,
      ...matched,
      subtitle: matched.productName
        ? `${task.subtitle} · ${matched.productName}`
        : task.subtitle,
    };
  };

  if (slot === "morning") {
    const wash =
      condition === "oily"
        ? { title: "Yengil shampun", subtitle: "Faqat ildizni yuving", icon: "water" as const, time: "07:00", timeHint: "07:00 · Ertalab", durationMin: 5 }
        : condition === "dry" || condition === "damaged"
          ? { title: "Namlantiruvchi yuvish", subtitle: "Iliq suv, yumshoq massaj", icon: "water" as const, time: "07:00", timeHint: "07:00 · Ertalab", durationMin: 6 }
          : { title: "Balans shampun", subtitle: "2–3 kunda bir yuvish", icon: "water" as const, time: "07:00", timeHint: "07:00 · Ertalab", durationMin: 5 };

    const style =
      texture === "curly"
        ? { title: "Leave-in krem", subtitle: "Nam sochga, diffuzer bilan", icon: "leaf" as const, time: "07:15", timeHint: "07:15 · Yuvishdan keyin", durationMin: 4 }
        : { title: "Styling krem", subtitle: "Kaftlarda eritib, kam miqdor", icon: "sparkles" as const, time: "07:15", timeHint: "07:15 · Yuvishdan keyin", durationMin: 3 };

    return shiftRoutineTimes(
      ([
      { id: "m-wash", ...wash, productHint: "shampoo" },
      { id: "m-condition", title: "Konditsioner", subtitle: "Faqat uchlarga, 1–2 daqiqa", icon: "flask" as const, productHint: "balsam", time: "07:08", timeHint: "07:08 · Shampundan keyin", durationMin: 3 },
      { id: "m-style", ...style, productHint: "spray" },
      ...(condition === "damaged"
        ? [{ id: "m-heat", title: "Issiqlik himoyasi", subtitle: "Fen oldidan sprey", icon: "shield" as const, productHint: "spray", time: "07:20", timeHint: "07:20 · Fen oldidan", durationMin: 1 }]
        : []),
    ] as RoutineTask[]).map(withProduct),
      schedule?.morningTime,
    );
  }

  if (slot === "evening") {
    return shiftRoutineTimes(
      ([
      { id: "e-brush", title: "Yengil tarash", subtitle: "Quruq sochda, yumshoq cho'tka", icon: "cut" as const, time: "21:00", timeHint: "21:00 · Kechqurun", durationMin: 3 },
      {
        id: "e-oil",
        title: condition === "oily" ? "Scalp massaj" : "Uchlar uchun yog'",
        subtitle: condition === "oily" ? "5 daqiqa, yengil bosim" : "2–3 tomchi, uchlarga",
        icon: "leaf" as const,
        productHint: "oil",
        time: "21:10",
        timeHint: "21:10 · Uxlamasdan oldin",
        durationMin: 5,
      },
      { id: "e-prep", title: "Ertaga rejasi", subtitle: "Nam sochni yumshoq sochiq bilan quriting", icon: "sparkles" as const, time: "21:20", timeHint: "21:20 · Kechqurun", durationMin: 2 },
      ...(colorStatus !== "natural"
        ? [{ id: "e-color", title: "Rang himoyasi", subtitle: "Color-safe mahsulotdan foydalaning", icon: "shield" as const, productHint: "shampoo", time: "21:25", timeHint: "21:25 · Kerak bo'lganda", durationMin: 2 }]
        : []),
    ] as RoutineTask[]).map(withProduct),
      schedule?.eveningTime,
    );
  }

  return shiftRoutineTimes(
    ([
    { id: "w-mask", title: "Chuqur maska", subtitle: condition === "damaged" ? "Protein + namlik" : "10 daqiqa parvarish", icon: "flask" as const, productHint: "mask", time: "20:30", timeHint: "20:30 · Haftada 1×", durationMin: 15 },
    { id: "w-scalp", title: "Scalp parvarishi", subtitle: condition === "oily" ? "Balans peel yoki skrab" : "Yengil massaj", icon: "water" as const, time: "20:45", timeHint: "20:45 · Haftada 1×", durationMin: 5 },
    { id: "w-trim", title: "Uchlarni tekshirish", subtitle: "Ajralish belgilarini kuzating", icon: "cut" as const, time: "11:00", timeHint: "11:00 · Yakshanba", durationMin: 5 },
    { id: "w-reset", title: "Haftalik reset", subtitle: "Ortiqcha styling qoldiqlarini yuvib tashlang", icon: "sparkles" as const, time: "19:00", timeHint: "19:00 · Hafta oxiri", durationMin: 10 },
  ] as RoutineTask[]).map(withProduct),
    schedule?.eveningTime,
  );
}

/** Cached AI care plan keyed by hair profile + product ids. */
export type CachedCarePlan = {
  plan: {
    summary: string;
    morning: Array<Record<string, unknown>>;
    evening: Array<Record<string, unknown>>;
    weekly: Array<Record<string, unknown>>;
    weekly_schedule: {
      day: string;
      task: string;
      time?: string;
      product_id?: number | null;
      product_name?: string;
    }[];
    tips: string[];
    avoid: string[];
  };
  productIds: number[];
  profileKey: string;
  updatedAt: string;
  /** Bump to invalidate old vague plans without clock times. */
  schemaVersion?: number;
};

const CARE_PLAN_CACHE_KEY = "mysaloon.morphAi.carePlanCache";
export const CARE_PLAN_SCHEMA_VERSION = 3;

/** Shu sessiyada oxirgi reja — sahifa qayta ochilganda disk kutmasdan. */
let memoryCarePlan: CachedCarePlan | null = null;

export function peekCachedCarePlan(): CachedCarePlan | null {
  return memoryCarePlan;
}

export function careProfileKey(quiz: CareQuizAnswers, schedule?: CareSchedulePrefs | null): string {
  const base = `${quiz.condition}|${quiz.texture}|${quiz.colorStatus}`;
  if (!schedule?.morningTime || !schedule?.eveningTime) return base;
  return `${base}|${schedule.morningTime}|${schedule.eveningTime}`;
}

export function sortProductIds(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

export async function loadCachedCarePlan(): Promise<CachedCarePlan | null> {
  try {
    const raw = await AsyncStorage.getItem(CARE_PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCarePlan;
    const morning = parsed?.plan?.morning;
    const evening = parsed?.plan?.evening;
    const hasSteps = Array.isArray(morning) || Array.isArray(evening);
    if (!parsed?.plan || !hasSteps) return null;
    if (!Array.isArray(parsed.productIds)) parsed.productIds = [];
    if (!parsed.profileKey) parsed.profileKey = "";
    memoryCarePlan = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedCarePlan(cache: CachedCarePlan): Promise<void> {
  const next = { ...cache, schemaVersion: CARE_PLAN_SCHEMA_VERSION };
  memoryCarePlan = next;
  await AsyncStorage.setItem(CARE_PLAN_CACHE_KEY, JSON.stringify(next));
}

export async function clearCachedCarePlan(): Promise<void> {
  memoryCarePlan = null;
  await AsyncStorage.removeItem(CARE_PLAN_CACHE_KEY);
}

/** Drop tasks tied to removed products; keep the rest unchanged. */
export function stripPlanProducts<T extends CachedCarePlan["plan"]>(
  plan: T,
  keepIds: Set<number>,
): T {
  const filterTasks = <R extends { product_id?: number | null }>(rows: R[]): R[] =>
    rows.filter((r) => {
      const pid = r.product_id;
      if (pid == null || pid === 0) return true;
      return keepIds.has(Number(pid));
    });

  return {
    ...plan,
    morning: filterTasks(plan.morning as { product_id?: number | null }[]),
    evening: filterTasks(plan.evening as { product_id?: number | null }[]),
    weekly: filterTasks(plan.weekly as { product_id?: number | null }[]),
  };
}

export type HairGrowthDensity = "sparse" | "medium" | "thick";

export type HairGrowthCheckIn = {
  id: string;
  created_at: string;
  length_cm: number;
  density: HairGrowthDensity;
  products_used: string[];
  photo_data_url?: string;
};

export type HairGrowthForecastStatus = "EXCELLENT" | "NORMAL" | "NEEDS_IMPROVEMENT";

export type HairGrowthForecast = {
  projected_length_3_months: number;
  /** Oyiga cm — projected bilan mos: current + monthly * 3 */
  monthly_growth_cm?: number;
  growth_rate_status: HairGrowthForecastStatus;
  ai_commentary: string;
  recommended_action: string;
  updated_at: string;
};

export type HairGrowthTrackerState = {
  check_ins: HairGrowthCheckIn[];
  forecast: HairGrowthForecast | null;
};

const HAIR_GROWTH_TRACKER_KEY = "mysaloon.morphAi.hairGrowthTracker";

function isDensity(v: unknown): v is HairGrowthDensity {
  return v === "sparse" || v === "medium" || v === "thick";
}

function normalizeCheckIn(row: unknown): HairGrowthCheckIn | null {
  if (!row || typeof row !== "object") return null;
  const src = row as Record<string, unknown>;
  const lengthRaw = Number(src.length_cm);
  if (!Number.isFinite(lengthRaw)) return null;
  const createdAt = String(src.created_at || "").trim();
  if (!createdAt) return null;
  const densityRaw = src.density;
  if (!isDensity(densityRaw)) return null;
  const products = Array.isArray(src.products_used)
    ? src.products_used.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12)
    : [];
  const photo = typeof src.photo_data_url === "string" && src.photo_data_url.trim()
    ? src.photo_data_url.trim()
    : undefined;

  return {
    id: String(src.id || `${Date.now()}`),
    created_at: createdAt,
    length_cm: Math.max(0, Math.min(200, Number(lengthRaw.toFixed(1)))),
    density: densityRaw,
    products_used: products,
    photo_data_url: photo,
  };
}

function normalizeForecast(row: unknown): HairGrowthForecast | null {
  if (!row || typeof row !== "object") return null;
  const src = row as Record<string, unknown>;
  const projected = Number(src.projected_length_3_months);
  const monthlyRaw = Number(src.monthly_growth_cm);
  const status = String(src.growth_rate_status || "").trim().toUpperCase();
  if (!Number.isFinite(projected)) return null;
  if (status !== "EXCELLENT" && status !== "NORMAL" && status !== "NEEDS_IMPROVEMENT") return null;
  const monthly =
    Number.isFinite(monthlyRaw) && monthlyRaw > 0
      ? Math.max(0.3, Math.min(2.5, Number(monthlyRaw.toFixed(2))))
      : undefined;
  return {
    projected_length_3_months: Math.max(0, Math.min(300, Number(projected.toFixed(1)))),
    ...(monthly != null ? { monthly_growth_cm: monthly } : {}),
    growth_rate_status: status,
    ai_commentary: String(src.ai_commentary || "").trim().slice(0, 220),
    recommended_action: String(src.recommended_action || "").trim().slice(0, 180),
    updated_at: String(src.updated_at || new Date().toISOString()),
  };
}

export async function loadHairGrowthTracker(): Promise<HairGrowthTrackerState> {
  try {
    const raw = await AsyncStorage.getItem(HAIR_GROWTH_TRACKER_KEY);
    if (!raw) {
      return { check_ins: [], forecast: null };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const checkInsRaw = Array.isArray(parsed.check_ins) ? parsed.check_ins : [];
    const checkIns = checkInsRaw
      .map(normalizeCheckIn)
      .filter((row): row is HairGrowthCheckIn => row != null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-24);
    return {
      check_ins: checkIns,
      forecast: normalizeForecast(parsed.forecast),
    };
  } catch {
    return { check_ins: [], forecast: null };
  }
}

export async function saveHairGrowthTracker(payload: HairGrowthTrackerState): Promise<void> {
  const cleanedCheckIns = [...payload.check_ins]
    .map(normalizeCheckIn)
    .filter((row): row is HairGrowthCheckIn => row != null)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-24);
  const cleaned: HairGrowthTrackerState = {
    check_ins: cleanedCheckIns,
    forecast: payload.forecast ? normalizeForecast(payload.forecast) : null,
  };
  await AsyncStorage.setItem(HAIR_GROWTH_TRACKER_KEY, JSON.stringify(cleaned));
}

export function countRecentCheckIns(checkIns: HairGrowthCheckIn[], days = 28): number {
  const now = Date.now();
  const threshold = now - Math.max(1, days) * 24 * 60 * 60 * 1000;
  return checkIns.filter((row) => {
    const ts = Date.parse(row.created_at);
    return Number.isFinite(ts) && ts >= threshold;
  }).length;
}

