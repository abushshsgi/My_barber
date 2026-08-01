import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import { loadFaceProfile, type SavedFaceProfile } from "@/lib/face-profile";

export type HairCondition = "oily" | "dry" | "normal" | "damaged";
export type HairTexture = "straight" | "wavy" | "curly";
export type HairDensity = "fine" | "medium" | "thick";
export type ScalpType = "oily" | "dry" | "sensitive";
export type ColorStatus = "natural" | "colored" | "bleached";
export type ProductBudget = "budget" | "mid" | "premium";

export type CareQuizAnswers = {
  condition: HairCondition;
  texture: HairTexture;
  colorStatus: ColorStatus;
  budget: ProductBudget;
};

export type CareProduct = {
  name: string;
  role: string;
  budget: ProductBudget;
  /** Deep link to local marketplace search (Uzum). */
  buyUrl: string;
};

export type CarePlan = {
  condition: HairCondition;
  texture: HairTexture;
  density: HairDensity;
  scalp: ScalpType;
  colorStatus: ColorStatus;
  summary: string;
  weekly: { day: string; task: string }[];
  products: CareProduct[];
  avoid: string[];
  salonTips: string[];
  nextCutDays: number;
};

const CARE_QUIZ_KEY = "mysaloon.morphAi.careQuiz";

export function loadCareQuiz(): CareQuizAnswers | null {
  try {
    const raw = localStorage.getItem(CARE_QUIZ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CareQuizAnswers;
    if (!parsed?.condition || !parsed?.texture || !parsed?.colorStatus || !parsed?.budget) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCareQuiz(answers: CareQuizAnswers) {
  localStorage.setItem(CARE_QUIZ_KEY, JSON.stringify(answers));
}

export function clearCareQuiz() {
  localStorage.removeItem(CARE_QUIZ_KEY);
}

function uzumSearchUrl(query: string): string {
  return `https://uzum.uz/uz/search?query=${encodeURIComponent(query)}`;
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

function pickDensity(hair?: HairTypeKey): HairDensity {
  if (hair === "long") return "medium";
  if (hair === "short") return "thick";
  return "medium";
}

function buildProducts(
  condition: HairCondition,
  colorStatus: ColorStatus,
  preferredBudget: ProductBudget,
): CareProduct[] {
  const base: CareProduct[] =
    condition === "oily"
      ? [
          {
            name: "Balancing shampoo",
            role: "Yuvish",
            budget: "mid",
            buyUrl: uzumSearchUrl("balancing shampoo soch"),
          },
          {
            name: "Lightweight conditioner",
            role: "Faqat uchlar",
            budget: "budget",
            buyUrl: uzumSearchUrl("lightweight conditioner"),
          },
          {
            name: "Volume cream",
            role: "Styling",
            budget: "mid",
            buyUrl: uzumSearchUrl("volume cream soch"),
          },
        ]
      : condition === "dry"
        ? [
            {
              name: "Hydrating shampoo",
              role: "Yuvish",
              budget: "mid",
              buyUrl: uzumSearchUrl("hydrating shampoo"),
            },
            {
              name: "Repair mask",
              role: "Parvarish",
              budget: "premium",
              buyUrl: uzumSearchUrl("hair repair mask"),
            },
            {
              name: "Leave-in cream",
              role: "Kundalik",
              budget: "mid",
              buyUrl: uzumSearchUrl("leave in cream soch"),
            },
          ]
        : condition === "damaged"
          ? [
              {
                name: "Bond repair shampoo",
                role: "Yuvish",
                budget: "premium",
                buyUrl: uzumSearchUrl("bond repair shampoo"),
              },
              {
                name: "Protein mask",
                role: "Parvarish",
                budget: "premium",
                buyUrl: uzumSearchUrl("protein hair mask"),
              },
              {
                name: "Heat protect spray",
                role: "Himoya",
                budget: "mid",
                buyUrl: uzumSearchUrl("heat protect spray"),
              },
            ]
          : [
              {
                name: "Gentle shampoo",
                role: "Yuvish",
                budget: "budget",
                buyUrl: uzumSearchUrl("gentle shampoo soch"),
              },
              {
                name: "Daily conditioner",
                role: "Parvarish",
                budget: "budget",
                buyUrl: uzumSearchUrl("daily conditioner"),
              },
              {
                name: "Matte paste / cream",
                role: "Styling",
                budget: "mid",
                buyUrl: uzumSearchUrl("matte hair paste"),
              },
            ];

  if (colorStatus === "colored" || colorStatus === "bleached") {
    base.push({
      name: colorStatus === "bleached" ? "Purple / tone shampoo" : "Color-safe shampoo",
      role: "Rang himoyasi",
      budget: "premium",
      buyUrl: uzumSearchUrl(
        colorStatus === "bleached" ? "purple shampoo" : "color safe shampoo",
      ),
    });
  }

  // Prefer matching budget first, keep others for filter UI.
  return [...base].sort((a, b) => {
    if (a.budget === preferredBudget && b.budget !== preferredBudget) return -1;
    if (b.budget === preferredBudget && a.budget !== preferredBudget) return 1;
    return 0;
  });
}

export function defaultQuizFromProfile(profile?: SavedFaceProfile | null): CareQuizAnswers {
  const face = profile ?? loadFaceProfile();
  return {
    condition: pickCondition(face),
    texture: pickTexture(face?.faceShapeKey),
    colorStatus: "natural",
    budget: "mid",
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
  const scalp: ScalpType = condition === "oily" ? "oily" : condition === "dry" ? "dry" : "sensitive";
  const colorStatus: ColorStatus = answers?.colorStatus ?? "natural";
  const budget = answers?.budget ?? "mid";

  const summaryByCondition: Record<HairCondition, string> = {
    oily:
      "Soch ildizi tez yog‘lanadi. Yengil yuvish va hajm beruvchi styling mos. Og‘ir maskalarni kamaytiring.",
    dry:
      "Soch uchlari quruqroq ko‘rinadi. Namlantirish va weekly maska muhim — crop/fade uslubini ham silliq saqlaydi.",
    normal:
      "Balans yaxshi. Oddiy rejim + 1 marta maska yetarli. Uslub shaklini saqlash uchun yengil styling gel/cream.",
    damaged:
      "Uchlar sinuvchan. Protein maska + trim tavsiya. Issiq stylingni kamaytiring.",
  };

  const colorNote =
    colorStatus === "bleached"
      ? " Bo‘yalgan/ochilgan soch: tonal shampoo va UV himoya qo‘shing."
      : colorStatus === "colored"
        ? " Bo‘yalgan soch: color-safe mahsulotlar tanlang."
        : "";

  const weekly =
    condition === "oily"
      ? [
          { day: "Du", task: "Yengil shampoo" },
          { day: "Chor", task: "Faqat ildizni yuvish" },
          { day: "Jum", task: "Yuvish + yengil leave-in" },
          { day: "Yak", task: "Scalp massage 3 daqiqa" },
        ]
      : condition === "dry" || condition === "damaged"
        ? [
            { day: "Du", task: "Namlantiruvchi shampoo" },
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
        ? ["Har kuni shampoo", "Yuqori temperatura fen", "Qattiq soch bog‘ich"]
        : ["Har kuni to‘liq yuvish", "Ortiqcha wax", "Quruq sochda tarash"];

  if (colorStatus !== "natural") {
    avoid.push("Sulfatli kuchli shampoo");
  }

  const salonTips = [
    "Har 3–5 haftada trim — shakl saqlanadi",
    "Uslubga mos styling demo so‘rang",
    density === "fine" ? "Og‘ir keratin o‘rniga yengil care tanlang" : "Keratin/maska seansi foydali bo‘lishi mumkin",
  ];
  if (texture === "curly") {
    salonTips.push("Jingalak soch uchun diffuzer va curl cream so‘rang");
  }

  return {
    condition,
    texture,
    density,
    scalp,
    colorStatus,
    summary: summaryByCondition[condition] + colorNote,
    weekly,
    products: buildProducts(condition, colorStatus, budget),
    avoid,
    salonTips,
    nextCutDays: face?.hairTypeKey === "short" ? 21 : 35,
  };
}
