import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  HairColorStatus,
  HairCondition,
  HairTexture,
} from "../api/care";

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
