import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import { loadFaceProfile, type SavedFaceProfile } from "@/lib/face-profile";

export type HairCondition = "oily" | "dry" | "normal" | "damaged";
export type HairTexture = "straight" | "wavy" | "curly";
export type ScalpType = "oily" | "dry" | "sensitive";
export type ColorStatus = "natural" | "colored" | "bleached";

export type CareQuizAnswers = {
  condition: HairCondition;
  texture: HairTexture;
  colorStatus: ColorStatus;
};

export type CareProduct = {
  name: string;
  role: string;
  tip: string;
};

export type CarePlan = {
  condition: HairCondition;
  texture: HairTexture;
  scalp: ScalpType;
  colorStatus: ColorStatus;
  summary: string;
  weekly: { day: string; task: string }[];
  products: CareProduct[];
  stylingTips: string[];
  avoid: string[];
  nextCutDays: number;
};

const CARE_QUIZ_KEY = "mysaloon.morphAi.careQuiz";

export const CARE_OPTION_IMAGES: Record<HairCondition | HairTexture | ColorStatus, string> = {
  oily: "/hairstyles/men/personas/niki/slick-back.webp",
  dry: "/hairstyles/men/personas/irland/bro-flow.webp",
  normal: "/hairstyles/men/personas/niki/mid-fade.webp",
  damaged: "/hairstyles/men/curly-shag.webp",
  straight: "/hairstyles/men/personas/niki/skin-fade.webp",
  wavy: "/hairstyles/men/personas/irland/classic-taper.webp",
  curly: "/hairstyles/men/natural-curly.webp",
  natural: "/hairstyles/men/personas/britan/mid-fade.webp",
  colored: "/hairstyles/men/personas/irland/comb-over-fade.webp",
  bleached: "/hairstyles/men/personas/niki/curly-top-fade.webp",
};

export function careOptionImage(key: HairCondition | HairTexture | ColorStatus): string {
  return CARE_OPTION_IMAGES[key] ?? "/hairstyles/men/personas/niki/mid-fade.webp";
}

export function loadCareQuiz(): CareQuizAnswers | null {
  try {
    const raw = localStorage.getItem(CARE_QUIZ_KEY);
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

export function saveCareQuiz(answers: CareQuizAnswers) {
  localStorage.setItem(
    CARE_QUIZ_KEY,
    JSON.stringify({
      condition: answers.condition,
      texture: answers.texture,
      colorStatus: answers.colorStatus,
    }),
  );
}

export function clearCareQuiz() {
  localStorage.removeItem(CARE_QUIZ_KEY);
}

function pickCondition(profile: SavedFaceProfile | null): HairCondition {
  if (!profile?.hairTypeKey) return "normal";
  if (profile.hairTypeKey === "long") return "dry";
  if (profile.hairTypeKey === "short") return "oily";
  return "normal";
}

function pickTexture(shape?: FaceShapeKey): HairTexture {
  if (shape === "round") return "wavy";
  if (shape === "square") return "straight";
  return "straight";
}

function pickDensity(hair?: HairTypeKey): "fine" | "medium" | "thick" {
  if (hair === "long") return "medium";
  if (hair === "short") return "thick";
  return "medium";
}

function buildProducts(condition: HairCondition, colorStatus: ColorStatus): CareProduct[] {
  let base: CareProduct[];

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

  if (texture === "curly") {
    tips.push("Diffuzer yoki barmoq — taroq emas.");
  } else if (texture === "wavy") {
    tips.push("Yengil cream, pastga qarab siqing.");
  } else {
    tips.push("Matte paste — tartib; pomade — slick.");
  }

  if (condition === "oily") {
    tips.push("Og‘ir oil va thick pomade dan saqlaning.");
  } else if (condition === "damaged" || condition === "dry") {
    tips.push("Fen past/o‘rta rejimda.");
  }

  return tips.slice(0, 4);
}

export function defaultQuizFromProfile(profile?: SavedFaceProfile | null): CareQuizAnswers {
  const face = profile ?? loadFaceProfile();
  return {
    condition: pickCondition(face),
    texture: pickTexture(face?.faceShapeKey),
    colorStatus: "natural",
  };
}

export function buildCarePlan(
  profile?: SavedFaceProfile | null,
  quiz?: CareQuizAnswers | null,
): CarePlan {
  const face = profile ?? loadFaceProfile();
  const answers = quiz ?? loadCareQuiz();
  const condition = answers?.condition ?? pickCondition(face);
  const texture = answers?.texture ?? pickTexture(face?.faceShapeKey);
  const density = pickDensity(face?.hairTypeKey);
  const scalp: ScalpType =
    condition === "oily" ? "oily" : condition === "dry" || condition === "damaged" ? "dry" : "sensitive";
  const colorStatus: ColorStatus = answers?.colorStatus ?? "natural";

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
  if (condition === "oily") {
    avoid = ["Har kuni oil", "Issiq suv", "Og‘ir serum"];
  } else if (condition === "dry" || condition === "damaged") {
    avoid = ["Har kuni shampun", "Issiq fen", "Qattiq bog‘ich"];
  } else {
    avoid = ["Har kuni yuvish", "Ortiqcha wax", "Quruq tarash"];
  }

  if (colorStatus !== "natural") {
    avoid.push("Sulfatli shampun");
  }

  const stylingTips = buildStylingTips(texture, condition);
  if (density === "fine") {
    stylingTips[stylingTips.length - 1] = "Yupqa soch: yengil paste.";
  }

  return {
    condition,
    texture,
    scalp,
    colorStatus,
    summary: summaryByCondition[condition] + colorNote,
    weekly,
    products: buildProducts(condition, colorStatus),
    stylingTips,
    avoid,
    nextCutDays: face?.hairTypeKey === "short" ? 21 : 35,
  };
}
