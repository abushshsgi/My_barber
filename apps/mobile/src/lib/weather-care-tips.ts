import type { WeatherConditionKey, WeatherCarePayload } from "../api/weather";
import type { MyCareProduct } from "./morph-my-products";

/** Ob-havo holatiga mos ambient hero rasmlar. */
export function weatherHeroImage(key: WeatherConditionKey | undefined): string {
  switch (key) {
    case "clear":
    case "mainly_clear":
      return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80";
    case "partly_cloudy":
      return "https://images.unsplash.com/photo-1501630834273-4b5604d9a5d6?auto=format&fit=crop&w=1400&q=80";
    case "overcast":
    case "cloudy":
      return "https://images.unsplash.com/photo-1499346030926-9af01ece1208?auto=format&fit=crop&w=1400&q=80";
    case "fog":
      return "https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=1400&q=80";
    case "drizzle":
    case "rain":
    case "showers":
      return "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1400&q=80";
    case "snow":
      return "https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=1400&q=80";
    case "storm":
      return "https://images.unsplash.com/photo-1605727216801-e27ce6d37b22?auto=format&fit=crop&w=1400&q=80";
    default:
      return "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1400&q=80";
  }
}

export type ProductWeatherTip = {
  productId: number;
  name: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  howToUse: string;
  tip: string;
};

type TipCtx = {
  condition: WeatherConditionKey;
  temp: number | null;
  humidity: number | null;
  wind: number | null;
};

function cat(p: MyCareProduct): string {
  return (p.category || "other").toLowerCase();
}

function wet(ctx: TipCtx): boolean {
  return ["rain", "drizzle", "showers", "storm", "snow"].includes(ctx.condition);
}

function dryAir(ctx: TipCtx): boolean {
  return ctx.humidity != null && ctx.humidity < 40;
}

function humidAir(ctx: TipCtx): boolean {
  return ctx.humidity != null && ctx.humidity >= 65;
}

function hot(ctx: TipCtx): boolean {
  return ctx.temp != null && ctx.temp >= 28;
}

function cold(ctx: TipCtx): boolean {
  return ctx.temp != null && ctx.temp <= 8;
}

function adviceForCategory(category: string, ctx: TipCtx): { howToUse: string; tip: string } {
  const isWet = wet(ctx);
  const isDry = dryAir(ctx);
  const isHumid = humidAir(ctx);
  const isHot = hot(ctx);
  const isCold = cold(ctx);

  if (category.includes("shampoo") || category === "cleanser") {
    if (isWet) {
      return {
        howToUse: "Bugun yuvishni qisqa qiling — 1× yuvib, sovuq suv bilan yuvib tashlang.",
        tip: "Yomg‘irda soch tez namlanadi; ortiqcha yuvish sebumni yo‘qotadi.",
      };
    }
    if (isDry || isCold) {
      return {
        howToUse: "Iliq suvda yuving, oxirida 20 soniya salqin suv. Kuniga 1 martadan ko‘p emas.",
        tip: "Quruq/sovuq havo scalpni quritadi — yumshoq formula afzal.",
      };
    }
    if (isHot || isHumid) {
      return {
        howToUse: "Yengil miqdor bilan ildizdan yuving; balsamni faqat uchlarga qo‘ying.",
        tip: "Issiq/nam kunda yog‘lanish tezroq — yengil shampun yaxshi.",
      };
    }
    return {
      howToUse: "Oddiy rejim: ildiz → ko‘pik → yaxshilab yuvib tashlash.",
      tip: "Bugungi ob-havo uchun standart yuvish yetarli.",
    };
  }

  if (category.includes("condition") || category.includes("balsam") || category === "mask") {
    if (isDry || isCold) {
      return {
        howToUse: "3–5 daqiqa ushlab turing; uchlarga ko‘proq qo‘ying, keyin yuvib tashlang.",
        tip: "Quruq havo uchun namlik beruvchi maska/balsam bugun foydali.",
      };
    }
    if (isHumid || isWet) {
      return {
        howToUse: "Yengil qatlam — faqat o‘rta va uchlarga; 1–2 daqiqa bas kifoya.",
        tip: "Nam havo sochni og‘irlashtiradi; kamroq mahsulot ishlating.",
      };
    }
    return {
      howToUse: "Yuvgandan keyin 2–3 daqiqa ushlab, iliq suvda yuving.",
      tip: "Namlikni saqlash uchun balsamni muntazam qo‘llang.",
    };
  }

  if (category.includes("oil") || category.includes("serum") || category.includes("leave")) {
    if (isWet || isHumid) {
      return {
        howToUse: "Faqat uchlarga 1–2 tomchi; ildizga tegmang.",
        tip: "Nam kunlarda oil/serum miqdorini yarimga kamaytiring.",
      };
    }
    if (isDry || isCold) {
      return {
        howToUse: "Nam sochda taroq bilan tarqating; kechasi yengil qatlam mumkin.",
        tip: "Quruq havo uchun himoya qatlami muhim — uchlarni muhofaza qiling.",
      };
    }
    return {
      howToUse: "Nam sochga 2–3 tomchi, taroq bilan bir tekis.",
      tip: "Issiq shamolda UV/himoya serumi foydali.",
    };
  }

  if (category.includes("spray") || category.includes("mist") || category.includes("tonic")) {
    if (isDry) {
      return {
        howToUse: "Kunduzi 1–2 marta yengil purkang; qo‘l bilan massaj qiling.",
        tip: "Past namlikda spray sochni jonlantiradi.",
      };
    }
    if (isHumid) {
      return {
        howToUse: "Anti-frizz yoki yengil hold spray — kam miqdorda.",
        tip: "Namlikda ortiqcha suvli spray jingalakni kuchaytirishi mumkin.",
      };
    }
    return {
      howToUse: "Stil oldidan yoki kun o‘rtasida yengil qatlam.",
      tip: "Bugun spray bilan shaklni saqlash oson.",
    };
  }

  if (category.includes("scalp") || category.includes("peel") || category.includes("scrub")) {
    if (isWet || isCold) {
      return {
        howToUse: "Bugun skrab/peelni o‘tkazib yuboring yoki juda yumshoq qiling.",
        tip: "Sovuq/nam kunlarda scalp sezgirroq bo‘ladi.",
      };
    }
    return {
      howToUse: "Haftada 1×: 3 daqiqa massaj, keyin shampun bilan yuving.",
      tip: "Toza scalp mahsulotlarning samaradorligini oshiradi.",
    };
  }

  if (isWet) {
    return {
      howToUse: "Bugun kamroq mahsulot — asosiy himoya va quritishga e’tibor.",
      tip: "Yomg‘irdan keyin sochni yumshoq sochiq bilan quriting, fenni past haroratda.",
    };
  }
  if (isHot && isDry) {
    return {
      howToUse: "Kunduzi SPF/himoya yoki yengil leave-in; kechqurun namlik.",
      tip: "Issiq + quruq havo sochni tez quritadi.",
    };
  }
  return {
    howToUse: "Mahsulotni odatiy tartibda qo‘llang; miqdorni soch holatiga qarab moslang.",
    tip: "Bugungi ob-havo uchun umumiy parvarish rejimini saqlang.",
  };
}

export function buildProductWeatherTips(
  products: MyCareProduct[],
  weather: WeatherCarePayload | null | undefined,
): ProductWeatherTip[] {
  if (!products.length || !weather?.current) return [];
  const ctx: TipCtx = {
    condition: weather.current.condition_key ?? "unknown",
    temp: weather.current.temperature_c,
    humidity: weather.current.humidity_pct,
    wind: weather.current.wind_kmh,
  };
  return products.slice(0, 8).map((p) => {
    const { howToUse, tip } = adviceForCategory(cat(p), ctx);
    return {
      productId: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      imageUrl: p.image_url,
      howToUse,
      tip,
    };
  });
}

export function generalWeatherExtras(ctx: {
  condition: WeatherConditionKey;
  temp: number | null;
  humidity: number | null;
  wind: number | null;
}): string[] {
  const out: string[] = [];
  if (wet({ ...ctx })) {
    out.push("Yomg‘irli kunda shlyapa yoki kapishon sochni himoya qiladi.");
    out.push("Uyga kelib sochni quriting — nam holda uxlash ildizni zaiflashtiradi.");
  }
  if (dryAir({ ...ctx })) {
    out.push("Xonada namlagich yoki issiq dush bug‘i scalp uchun foydali.");
    out.push("Issiq fen o‘rniga past harorat yoki havo quritishni tanlang.");
  }
  if (humidAir({ ...ctx })) {
    out.push("Anti-frizz yoki yengil gel bilan shaklni saqlang.");
    out.push("Og‘ir yog‘li stylerlarni bugun kamaytiring.");
  }
  if (hot({ ...ctx })) {
    out.push("Quyoshda uzoq tursangiz, soch uchun UV himoya yoki shlyapa.");
  }
  if (cold({ ...ctx })) {
    out.push("Sovuqda scalpni quruq saqlang — shlyapa + yumshoq leave-in.");
  }
  if (ctx.wind != null && ctx.wind >= 25) {
    out.push("Kuchli shamolda sochni bog‘lab yuring — chalkashish kamayadi.");
  }
  if (!out.length) {
    out.push("Suv ichish va muvozanatli ovqatlanish soch sifatiga ham ta’sir qiladi.");
    out.push("Haftada 1× chuqur maska — ob-havo o‘zgarishiga chidamlilikni oshiradi.");
  }
  return out.slice(0, 4);
}

/** Hub sheet — iPhone 14 / Pro / Pro Max, Samsung, Redmi. */
export function careHubLayout(width: number, height: number) {
  const short = height < 740;
  const tall = height >= 900;
  const narrow = width < 360;

  // Kartochkalar target 150
  const hubCardH = 150;
  // AI qatori
  const aiH = 70;
  const promoH = short ? 168 : tall ? 200 : width >= 428 ? 192 : 184;
  const sheetH = 28 + 10 + hubCardH + 10 + aiH + 12;

  return { hubCardH, aiH, promoH, sheetH, hPad: narrow ? 12 : 16 };
}
