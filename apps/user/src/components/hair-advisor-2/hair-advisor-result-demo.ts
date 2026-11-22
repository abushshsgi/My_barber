import type { HairScanDetail } from "@/lib/api/hair-advisor";

/** UI ko‘rish: /ai-style/care/ingredient/result/demo (APIsiz). */
export const HAIR_ADVISOR_RESULT_DEMO: HairScanDetail = {
  id: "00000000-0000-4000-8000-000000000demo",
  status: "completed",
  barcode: "4006381333931",
  catalog_tier: "verified",
  ingredients_draft: [],
  ingredients_confirmed: [
    "Aqua",
    "Sodium Laureth Sulfate",
    "Cocamidopropyl Betaine",
    "Glycerin",
    "Sodium Chloride",
    "Parfum",
    "Panthenol",
    "Citric Acid",
  ],
  care_product: {
    id: 9001,
    name: "Deep Cleanse Shampoo",
    brand: "Clear",
    image_url: null,
    volume_ml: 400,
    country_of_origin: "Germaniya",
    barcode: "4006381333931",
    is_verified: true,
    ingredients: [
      "Aqua",
      "Sodium Laureth Sulfate",
      "Cocamidopropyl Betaine",
      "Glycerin",
      "Sodium Chloride",
      "Parfum",
      "Panthenol",
      "Citric Acid",
    ],
  },
  analysis: {
    id: 1,
    recommendation: "POTENTIAL_MATCH",
    data_confidence: "high",
    explanation_uz:
      "Sizning normal va to‘g‘ri tuzilgan sochingiz uchun yengil tozalovchi formulasi mos. Panthenol namlantirish beradi; kundalik yuvish uchun ma’qul. Agar teri sezuvchan bo‘lsa, sulfat miqdoriga e’tibor bering.",
    result: {
      ingredients: [
        "Aqua",
        "Sodium Laureth Sulfate",
        "Cocamidopropyl Betaine",
        "Glycerin",
        "Sodium Chloride",
        "Parfum",
        "Panthenol",
        "Citric Acid",
      ],
      catalog_tier: "verified",
      key_ingredients: [
        { inci: "Panthenol", role: "namlantiruvchi" },
        { inci: "Glycerin", role: "namlantiruvchi" },
        { inci: "Cocamidopropyl Betaine", role: "yumshoq surfaktant" },
      ],
      explanation: {
        summary_bullets_uz: [
          "Yengil tozalash — kunlik parvarish uchun mos.",
          "Panthenol va glycerin sochni quruqlikdan himoya qiladi.",
        ],
        cautions_uz: [
          "Sulfatlar sezuvchan bosh terisi uchun qattiq bo‘lishi mumkin.",
          "Atir kamida bo‘lsa, allergiya xavfi kamayadi.",
        ],
      },
    },
  },
};

export function isHairAdvisorResultDemoScanId(scanId: string): boolean {
  return scanId === "demo" || scanId === "preview";
}