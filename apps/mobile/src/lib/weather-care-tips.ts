import type { WeatherConditionKey, WeatherCarePayload } from "../api/weather";
import type { MyCareProduct } from "./morph-my-products";
import { clamp, layoutScale, rs } from "./responsive";

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

/** Hub — bitta ekranga sig‘adi (scroll yo‘q), SE→Pro Max scale. Tab dock yo‘q. */
export function careHubLayout(
  width: number,
  height: number,
  topInset = 0,
  bottomInset = 0,
) {
  /** Window o‘lchami o‘zgaganda (web / rotate) qayta hisoblanadi. */
  const scale = layoutScale(width, height);
  /** Faqat Home Indicator — floating tab bar Care hubda yashiriladi. */
  const dockClearance = Math.max(bottomInset, 10);
  const avail = Math.max(360, height - dockClearance);

  const searchBlock = rs(52, scale);
  const catBlock = Math.max(32, rs(34, scale));
  const reportHead = rs(22, scale);
  const weatherNudge = 5;
  const sheetTop = rs(14, scale);
  const gaps = rs(16, scale) + weatherNudge;
  const chrome = searchBlock + catBlock + reportHead + gaps + sheetTop;

  const remain = Math.max(rs(260, scale), avail - chrome);

  const hPad = width < 360 ? 12 : width < 400 ? rs(14, scale) : rs(16, scale);
  const promoW = Math.max(240, width - 2 * hPad);
  /** Home banner bilan bir xil ~2.15:1 — kenglikka mos hero balandligi. */
  const PROMO_ASPECT = 2.15;
  const promoByWidth = Math.round(promoW / PROMO_ASPECT);

  /**
   * Hero `paddingTop: topInset` ni o‘z balandligida yutadi — tashqarida
   * qayta qo‘shilmaydi, aks holda AI bar kesiladi.
   */
  const MIN = {
    promo: topInset + Math.max(rs(96, scale), Math.min(promoByWidth, rs(118, scale))),
    featured: rs(128, scale),
    hubCard: rs(108, scale),
    ai: rs(44, scale),
  };
  const MAX = {
    promo:
      topInset +
      clamp(
        Math.max(rs(132, scale), promoByWidth),
        rs(120, scale),
        Math.min(rs(200, scale), Math.round(height * 0.26)),
      ),
    featured: rs(196, scale),
    hubCard: rs(148, scale),
    ai: rs(54, scale),
  };

  const minTotal = MIN.promo + MIN.featured + MIN.hubCard + MIN.ai;
  const headroom =
    MAX.promo - MIN.promo +
    (MAX.featured - MIN.featured) +
    (MAX.hubCard - MIN.hubCard) +
    (MAX.ai - MIN.ai);

  let promoH: number;
  let featuredH: number;
  let hubCardH: number;
  let aiH: number;

  if (remain <= minTotal) {
    const k = remain / minTotal;
    promoH = Math.floor(MIN.promo * k);
    featuredH = Math.floor(MIN.featured * k);
    hubCardH = Math.floor(MIN.hubCard * k);
    aiH = Math.max(rs(40, scale), remain - promoH - featuredH - hubCardH);
  } else {
    const k = headroom > 0 ? Math.min(1, (remain - minTotal) / headroom) : 0;
    const grow = (min: number, max: number) => Math.round(min + (max - min) * k);
    promoH = grow(MIN.promo, MAX.promo);
    featuredH = grow(MIN.featured, MAX.featured);
    hubCardH = grow(MIN.hubCard, MAX.hubCard);
    aiH = grow(MIN.ai, MAX.ai);
  }

  const featuredW = clamp(Math.round(featuredH * 0.96), rs(148, scale), rs(208, scale));
  const sheetGap = rs(12, scale);
  const promoInner = Math.max(0, promoH - topInset);
  const narrow = width < 360;
  const promoPad = narrow ? 10 : width < 400 ? rs(12, scale) : rs(14, scale);
  const promoRadius = narrow ? 18 : rs(22, scale);

  return {
    scale,
    avail,
    hubCardH,
    aiH,
    promoH,
    featuredH,
    featuredW,
    searchBlock,
    catBlock,
    weatherNudge,
    sheetTop,
    sheetGap,
    sheetH: reportHead + sheetTop + sheetGap + hubCardH + sheetGap + aiH + rs(8, scale),
    hPad,
    dockClearance,
    promoPad,
    promoRadius,
    promoTempSize: rs(
      promoInner >= rs(140, scale) ? 42 : promoInner >= rs(110, scale) ? 36 : 30,
      scale,
    ),
    promoTitleSize: rs(narrow ? 14 : promoInner >= rs(130, scale) ? 16 : 15, scale),
    promoRich: promoInner >= rs(118, scale),
    hubCardRich: hubCardH >= rs(114, scale),
    featuredRich: featuredH >= rs(132, scale),
  };
}

