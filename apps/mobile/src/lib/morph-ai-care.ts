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
  condition: HairCondition;
  texture: HairTexture;
  colorStatus: HairColorStatus;
};

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
  return { condition: "normal", texture: "straight", colorStatus: "natural" };
}

export function buildCarePlan(quiz: CareQuizAnswers): CarePlan {
  const { condition, texture, colorStatus } = quiz;
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
): RoutineTask[] {
  const { condition, texture, colorStatus } = quiz;

  const pick = (hint?: string): { productId?: number; productName?: string } => {
    if (!hint || !myProducts?.length) return {};
    const hit = myProducts.find((p) => (p.category || "").toLowerCase() === hint);
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

    return ([
      { id: "m-wash", ...wash, productHint: "shampoo" },
      { id: "m-condition", title: "Konditsioner", subtitle: "Faqat uchlarga, 1–2 daqiqa", icon: "flask" as const, productHint: "balsam", time: "07:08", timeHint: "07:08 · Shampundan keyin", durationMin: 3 },
      { id: "m-style", ...style, productHint: "spray" },
      ...(condition === "damaged"
        ? [{ id: "m-heat", title: "Issiqlik himoyasi", subtitle: "Fen oldidan sprey", icon: "shield" as const, productHint: "spray", time: "07:20", timeHint: "07:20 · Fen oldidan", durationMin: 1 }]
        : []),
    ] as RoutineTask[]).map(withProduct);
  }

  if (slot === "evening") {
    return ([
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
    ] as RoutineTask[]).map(withProduct);
  }

  return ([
    { id: "w-mask", title: "Chuqur maska", subtitle: condition === "damaged" ? "Protein + namlik" : "10 daqiqa parvarish", icon: "flask" as const, productHint: "mask", time: "20:30", timeHint: "20:30 · Haftada 1×", durationMin: 15 },
    { id: "w-scalp", title: "Scalp parvarishi", subtitle: condition === "oily" ? "Balans peel yoki skrab" : "Yengil massaj", icon: "water" as const, time: "20:45", timeHint: "20:45 · Haftada 1×", durationMin: 5 },
    { id: "w-trim", title: "Uchlarni tekshirish", subtitle: "Ajralish belgilarini kuzating", icon: "cut" as const, time: "11:00", timeHint: "11:00 · Yakshanba", durationMin: 5 },
    { id: "w-reset", title: "Haftalik reset", subtitle: "Ortiqcha styling qoldiqlarini yuvib tashlang", icon: "sparkles" as const, time: "19:00", timeHint: "19:00 · Hafta oxiri", durationMin: 10 },
  ] as RoutineTask[]).map(withProduct);
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
export const CARE_PLAN_SCHEMA_VERSION = 2;

export function careProfileKey(quiz: CareQuizAnswers): string {
  return `${quiz.condition}|${quiz.texture}|${quiz.colorStatus}`;
}

export function sortProductIds(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

export async function loadCachedCarePlan(): Promise<CachedCarePlan | null> {
  try {
    const raw = await AsyncStorage.getItem(CARE_PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCarePlan;
    if (!parsed?.plan || !Array.isArray(parsed.productIds) || !parsed.profileKey) return null;
    if ((parsed.schemaVersion ?? 1) < CARE_PLAN_SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedCarePlan(cache: CachedCarePlan): Promise<void> {
  await AsyncStorage.setItem(
    CARE_PLAN_CACHE_KEY,
    JSON.stringify({ ...cache, schemaVersion: CARE_PLAN_SCHEMA_VERSION }),
  );
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

