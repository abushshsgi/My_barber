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
        ? { title: "Yengil shampun", subtitle: "Faqat ildizni yuving", icon: "water" as const, timeHint: "Ertalab" }
        : condition === "dry" || condition === "damaged"
          ? { title: "Namlantiruvchi yuvish", subtitle: "Iliq suv, yumshoq massaj", icon: "water" as const, timeHint: "Ertalab" }
          : { title: "Balans shampun", subtitle: "2–3 kunda bir yuvish", icon: "water" as const, timeHint: "Ertalab" };

    const style =
      texture === "curly"
        ? { title: "Leave-in krem", subtitle: "Nam sochga, diffuzer bilan", icon: "leaf" as const, timeHint: "Yuvishdan keyin" }
        : { title: "Styling krem", subtitle: "Kaftlarda eritib, kam miqdor", icon: "sparkles" as const, timeHint: "Yuvishdan keyin" };

    return ([
      { id: "m-wash", ...wash, productHint: "shampoo" },
      { id: "m-condition", title: "Konditsioner", subtitle: "Faqat uchlarga, 1–2 daqiqa", icon: "flask" as const, productHint: "balsam", timeHint: "Shampundan keyin" },
      { id: "m-style", ...style, productHint: "spray" },
      ...(condition === "damaged"
        ? [{ id: "m-heat", title: "Issiqlik himoyasi", subtitle: "Fen oldidan sprey", icon: "shield" as const, productHint: "spray", timeHint: "Fen oldidan" }]
        : []),
    ] as RoutineTask[]).map(withProduct);
  }

  if (slot === "evening") {
    return ([
      { id: "e-brush", title: "Yengil tarash", subtitle: "Quruq sochda, yumshoq cho'tka", icon: "cut" as const, timeHint: "Kechqurun" },
      {
        id: "e-oil",
        title: condition === "oily" ? "Scalp massaj" : "Uchlar uchun yog'",
        subtitle: condition === "oily" ? "5 daqiqa, yengil bosim" : "2–3 tomchi, uchlarga",
        icon: "leaf" as const,
        productHint: "oil",
        timeHint: "Uxlamasdan oldin",
      },
      { id: "e-prep", title: "Ertaga rejasi", subtitle: "Nam sochni yumshoq sochiq bilan quriting", icon: "sparkles" as const, timeHint: "Kechqurun" },
      ...(colorStatus !== "natural"
        ? [{ id: "e-color", title: "Rang himoyasi", subtitle: "Color-safe mahsulotdan foydalaning", icon: "shield" as const, productHint: "shampoo", timeHint: "Kerak bo'lganda" }]
        : []),
    ] as RoutineTask[]).map(withProduct);
  }

  return ([
    { id: "w-mask", title: "Chuqur maska", subtitle: condition === "damaged" ? "Protein + namlik" : "10 daqiqa parvarish", icon: "flask" as const, productHint: "mask", timeHint: "Haftada 1×" },
    { id: "w-scalp", title: "Scalp parvarishi", subtitle: condition === "oily" ? "Balans peel yoki skrab" : "Yengil massaj", icon: "water" as const, timeHint: "Haftada 1×" },
    { id: "w-trim", title: "Uchlarni tekshirish", subtitle: "Ajralish belgilarini kuzating", icon: "cut" as const, timeHint: "Yakshanba" },
    { id: "w-reset", title: "Haftalik reset", subtitle: "Ortiqcha styling qoldiqlarini yuvib tashlang", icon: "sparkles" as const, timeHint: "Hafta oxiri" },
  ] as RoutineTask[]).map(withProduct);
}
