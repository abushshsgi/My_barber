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

/** Visual references for quiz options (local hairstyle assets). */
export const CARE_OPTION_IMAGES: Record<
  HairCondition | HairTexture | ColorStatus,
  string
> = {
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

export function careOptionImage(
  key: HairCondition | HairTexture | ColorStatus,
): string {
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
  const base: CareProduct[] =
    condition === "oily"
      ? [
          {
            name: "Balanslash shampuni",
            role: "Yuvish",
            tip: "Faqat ildizga surting, uchlarga kamroq tushiring.",
          },
          {
            name: "Yengil konditsioner",
            role: "Uchlar",
            tip: "Faqat soch uchlariga 1–2 daqiqa ushlang, keyin yuving.",
          },
          {
            name: "Volume cream / paste",
            role: "Styling",
            tip: "No‘xatdek miqdor — nam sochga, keyin fen bilan shakl bering.",
          },
        ]
      : condition === "dry"
        ? [
            {
              name: "Namlantiruvchi shampun",
              role: "Yuvish",
              tip: "Iliq suvda yuving — issiq suv quruqlikni kuchaytiradi.",
            },
            {
              name: "Repair maska",
              role: "Parvarish",
              tip: "Haftada 1 marta 8–10 daqiqa, faqat uzunlikka.",
            },
            {
              name: "Leave-in krem",
              role: "Kundalik",
              tip: "Soch quritgandan keyin uchlarga yupqa qatlam.",
            },
          ]
        : condition === "damaged"
          ? [
              {
                name: "Bond / repair shampun",
                role: "Yuvish",
                tip: "Yumshoq massaj — tirnoq bilan ishqalamang.",
              },
              {
                name: "Protein maska",
                role: "Parvarish",
                tip: "Haftada 1 marta; ortiqcha qoldirmang — soch qotib qolishi mumkin.",
              },
              {
                name: "Issiqlik himoyasi",
                role: "Himoya",
                tip: "Fen/to‘g‘rilagichdan oldin har doim surting.",
              },
            ]
          : [
              {
                name: "Yumshoq shampun",
                role: "Yuvish",
                tip: "Kunora emas — 2–3 kunda bir marta yetarli.",
              },
              {
                name: "Kundalik konditsioner",
                role: "Parvarish",
                tip: "Uchlardan o‘rtagacha, ildizga emas.",
              },
              {
                name: "Matte paste / cream",
                role: "Styling",
                tip: "Quruq sochga ishqalang, keyin barmoq bilan shakl bering.",
              },
            ];

  if (colorStatus === "bleached") {
    base.push({
      name: "Purple / tone shampun",
      role: "Rang",
      tip: "Haftada 1 marta — sariqlikni kamaytiradi.",
    });
  } else if (colorStatus === "colored") {
    base.push({
      name: "Color-safe shampun",
      role: "Rang",
      tip: "Sulfatsiz turini tanlang — rang uzoqroq turadi.",
    });
  }

  return base;
}

function buildStylingTips(texture: HairTexture, condition: HairCondition): string[] {
  const tips: string[] = [
    "Gel/paste ni avval kaftlarda eriting, keyin sochga surting.",
    "Ko‘p mahsulot emas — kamroq bilan boshlang, kerak bo‘lsa qo‘shing.",
  ];

  if (texture === "curly") {
    tips.push("Jingalak soch: taroq o‘rniga barmoq yoki diffuzer ishlating.");
    tips.push("Curl cream ni nam sochga, yuqoridan pastga qarab.");
  } else if (texture === "wavy") {
    tips.push("To‘lqin: yengil cream + pastga qarab siqib quritish.");
  } else {
    tips.push("To‘g‘ri soch: matte paste bilan tartib, yaltiroq pomade bilan slick.");
  }

  if (condition === "oily") {
    tips.push("Og‘ir oil va thick pomade dan saqlaning — ildiz tez yog‘lanadi.");
  } else if (condition === "damaged" || condition === "dry") {
    tips.push("Issiq fenni past/o‘rta rejimda ishlating.");
  }

  return tips;
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

  const textureLabel =
    texture === "curly" ? "jingalak" : texture === "wavy" ? "to‘lqinsimon" : "to‘g‘ri";

  const summaryByCondition: Record<HairCondition, string> = {
    oily:
      `Sizning so‘rovingizga asosan soch ildizi tez yog‘lanadi (${textureLabel}). Yengil yuvish va kam mahsulot — uslub shakli uzoqroq turadi.`,
    dry:
      `Sizning so‘rovingizga asosan uchlar quruqroq (${textureLabel}). Namlantirish + leave-in — crop/fade ham silliqroq ko‘rinadi.`,
    normal:
      `Sizning so‘rovingizga asosan balans yaxshi (${textureLabel}). Oddiy rejim va yengil styling yetarli — shaklni saqlash oson.`,
    damaged:
      `Sizning so‘rovingizga asosan uchlar sinuvchan (${textureLabel}). Repair + issiqlik himoyasi; trimni kechiktirmang.`,
  };

  const colorNote =
    colorStatus === "bleached"
      ? " Ochilgan sochni esladik: tonal shampun va UV himoya qo‘shing."
      : colorStatus === "colored"
        ? " Bo‘yalgan sochni esladik: color-safe mahsulotlar tanlang."
        : " Tabiiy rangni esladik — yumshoq parvarish yetarli.";

  const weekly =
    condition === "oily"
      ? [
          { day: "Du", task: "Yengil shampun" },
          { day: "Chor", task: "Faqat ildizni yuvish" },
          { day: "Jum", task: "Yuvish + yengil leave-in" },
          { day: "Yak", task: "Bosh terisi massaji 3 daqiqa" },
        ]
      : condition === "dry" || condition === "damaged"
        ? [
            { day: "Du", task: "Namlantiruvchi shampun" },
            { day: "Chor", task: "Deep maska 10 daqiqa" },
            { day: "Jum", task: "Yuvish + leave-in" },
            { day: "Yak", task: "Uchlarga oil (1–2 tomchi)" },
          ]
        : [
            { day: "Du", task: "Oddiy yuvish" },
            { day: "Chor", task: "Yengil conditioning" },
            { day: "Jum", task: "Yuvish + styling" },
            { day: "Yak", task: "Maska (ixtiyoriy)" },
          ];

  const avoid =
    condition === "oily"
      ? ["Har kuni og‘ir oil", "Issiq suvda uzoq yuvish", "Silikonli og‘ir serum"]
      : condition === "dry" || condition === "damaged"
        ? ["Har kuni shampun", "Yuqori temperatura fen", "Qattiq soch bog‘ich"]
        : ["Har kuni to‘liq yuvish", "Ortiqcha wax", "Quruq sochda kuchli tarash"];

  if (colorStatus !== "natural") {
    avoid.push("Sulfatli kuchli shampun");
  }

  const stylingTips = buildStylingTips(texture, condition);
  if (density === "fine") {
    stylingTips.push("Yupqa soch: og‘ir krem o‘rniga yengil paste tanlang.");
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
