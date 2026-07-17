import type { FaceShapeKey, HairTypeKey } from "@/components/ai-style/ai-style-shared";
import { loadFaceProfile, type SavedFaceProfile } from "@/lib/face-profile";

export type HairCondition = "oily" | "dry" | "normal" | "damaged";
export type HairTexture = "straight" | "wavy" | "curly";
export type HairDensity = "fine" | "medium" | "thick";
export type ScalpType = "oily" | "dry" | "sensitive";
export type ColorStatus = "natural" | "colored" | "bleached";
export type ProductBudget = "budget" | "mid" | "premium";

export type CarePlan = {
  condition: HairCondition;
  texture: HairTexture;
  density: HairDensity;
  scalp: ScalpType;
  colorStatus: ColorStatus;
  summary: string;
  weekly: { day: string; task: string }[];
  products: { name: string; role: string; budget: ProductBudget }[];
  avoid: string[];
  salonTips: string[];
  nextCutDays: number;
};

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

export function buildCarePlan(profile?: SavedFaceProfile | null): CarePlan {
  const face = profile ?? loadFaceProfile();
  const condition = pickCondition(face);
  const texture = pickTexture(face?.faceShapeKey);
  const density = pickDensity(face?.hairTypeKey);
  const scalp: ScalpType = condition === "oily" ? "oily" : condition === "dry" ? "dry" : "sensitive";
  const colorStatus: ColorStatus = "natural";

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

  const weekly =
    condition === "oily"
      ? [
          { day: "Du", task: "Yengil shampoo" },
          { day: "Chor", task: "Faqat ildizni yuvish" },
          { day: "Jum", task: "Yuvish + yengil leave-in" },
          { day: "Yak", task: "Scalp massage 3 daqiqa" },
        ]
      : condition === "dry"
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

  const products: CarePlan["products"] =
    condition === "oily"
      ? [
          { name: "Balancing shampoo", role: "Yuvish", budget: "mid" },
          { name: "Lightweight conditioner", role: "Faqat uchlar", budget: "budget" },
          { name: "Volume cream", role: "Styling", budget: "mid" },
        ]
      : condition === "dry"
        ? [
            { name: "Hydrating shampoo", role: "Yuvish", budget: "mid" },
            { name: "Repair mask", role: "Parvarish", budget: "premium" },
            { name: "Leave-in cream", role: "Kundalik", budget: "mid" },
          ]
        : [
            { name: "Gentle shampoo", role: "Yuvish", budget: "budget" },
            { name: "Daily conditioner", role: "Parvarish", budget: "budget" },
            { name: "Matte paste / cream", role: "Styling", budget: "mid" },
          ];

  const avoid =
    condition === "oily"
      ? ["Har kuni og‘ir oil", "Issiq suvda uzoq yuvish", "Silikonli og‘ir serum"]
      : condition === "dry"
        ? ["Har kuni shampoo", "Yuqori temperatura fen", "Qattiq soch bog‘ich"]
        : ["Har kuni to‘liq yuvish", "Ortiqcha wax", "Quruq sochda tarash"];

  const salonTips = [
    "Har 3–5 haftada trim — shakl saqlanadi",
    "Uslubga mos styling demo so‘rang",
    density === "fine" ? "Og‘ir keratin o‘rniga yengil care tanlang" : "Keratin/maska seansi foydali bo‘lishi mumkin",
  ];

  return {
    condition,
    texture,
    density,
    scalp,
    colorStatus,
    summary: summaryByCondition[condition],
    weekly,
    products,
    avoid,
    salonTips,
    nextCutDays: face?.hairTypeKey === "short" ? 21 : 35,
  };
}
