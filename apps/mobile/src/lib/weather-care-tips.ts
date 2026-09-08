import type { ImageSourcePropType } from "react-native";
import type { WeatherConditionKey, WeatherCarePayload } from "../api/weather";
import type { MyCareProduct } from "./morph-my-products";
import { BASE_H, BASE_W, clamp, rs } from "./responsive";
import {
  resolveUzRegion,
  uzRegionImageSource,
  type UzRegionId,
} from "./uz-regions";

function hubLayoutScale(width: number, height: number) {
  return clamp(Math.min(width / BASE_W, height / BASE_H), 0.72, 1.12);
}

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

/** Joylashuv bo‘yicha local viloyat hero (o‘ngda mashhur joy). */
export function weatherLocationHeroSource(opts: {
  region?: string | null;
  place?: string | null;
  condition?: WeatherConditionKey;
  lat?: number | null;
  lon?: number | null;
  regionId?: UzRegionId | null;
}): ImageSourcePropType {
  const id =
    opts.regionId ||
    resolveUzRegion({
      region: opts.region,
      place: opts.place,
      lat: opts.lat,
      lon: opts.lon,
    });
  const local = uzRegionImageSource(id);
  if (local) return local;
  return { uri: weatherHeroImage(opts.condition) };
}

/** @deprecated — weatherLocationHeroSource ishlating */
export function weatherLocationHeroImage(
  region?: string | null,
  place?: string | null,
  condition?: WeatherConditionKey,
): string {
  const id = resolveUzRegion({ region, place });
  if (id) {
    // Local asset URI emas — chaqiruvchilar Source ga o‘tishi kerak
    return weatherHeroImage(condition);
  }
  return weatherHeroImage(condition);
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
  const scale = hubLayoutScale(width, height);
  /** Floating tab dock yo‘q (hubda yashirin) — faqat home indicator. */
  const dockClearance = Math.max(bottomInset, 12) + 8;
  const avail = Math.max(360, height - dockClearance);

  const searchBlock = rs(52, scale);
  const reportHead = rs(24, scale);
  const weatherNudge = 6;
  const promoTopGap = rs(8, scale);
  const sheetTop = rs(14, scale);
  /** Search ↔ category orasidagi bo‘shliq. */
  const searchCatGap = rs(8, scale);
  const gaps = rs(10, scale) + weatherNudge + searchCatGap;
  const quickActionWCap =
    width < 360 ? rs(88, scale) : width < 400 ? rs(94, scale) : rs(100, scale);
  const quickActionW = clamp(
    Math.round(rs(92, scale)),
    width < 360 ? rs(80, scale) : rs(86, scale),
    quickActionWCap,
  );
  const quickActionH = clamp(
    Math.round(quickActionW * 0.96),
    rs(78, scale),
    rs(96, scale),
  );
  /** SOS + shelf + growth + album — bitta gorizontal qator (Yandex Go promo uslubi). */
  const quickActionBlock = quickActionH + rs(6, scale);

  const chrome = searchBlock + quickActionBlock + reportHead + gaps + sheetTop + promoTopGap;

  const remain = Math.max(rs(260, scale), avail - chrome);

  const hPad = width < 360 ? 12 : width < 400 ? rs(14, scale) : rs(16, scale);
  const promoW = Math.max(240, width - 2 * hPad);
  /** Hero biroz pastroq — sheet asosiy fokus. */
  const PROMO_ASPECT = 2.25;
  const promoByWidth = Math.round(promoW / PROMO_ASPECT);

  /**
   * Hero status bar ostida boshlanadi (`marginTop: topInset` CareScreen da).
   * Balandlikka inset qo‘shilmaydi — aks holda banner kesiladi.
   */
  const MIN = {
    /** chip + temp + CTA sig‘ishi shart — aks holda tugma kesiladi. */
    promo: Math.max(rs(118, scale), Math.min(promoByWidth, rs(148, scale))),
    featured: rs(width < 360 ? 108 : 120, scale),
    hubCard: rs(128, scale),
    ai: rs(48, scale),
  };
  const MAX = {
    promo: clamp(
      Math.max(rs(132, scale), promoByWidth),
      rs(128, scale),
      Math.min(rs(176, scale), Math.round(height * 0.24)),
    ),
    featured: rs(156, scale),
    hubCard: rs(176, scale),
    ai: rs(58, scale),
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

  const featuredWCap = width < 360 ? rs(118, scale) : width < 400 ? rs(132, scale) : rs(148, scale);
  const featuredW = clamp(
    Math.round(featuredH * 0.84),
    width < 360 ? rs(96, scale) : rs(108, scale),
    featuredWCap,
  );
  const sheetGap = rs(12, scale);
  const promoInner = promoH;
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
    quickActionW,
    quickActionH,
    quickActionBlock,
    weatherNudge,
    searchCatGap,
    promoTopGap,
    sheetTop,
    sheetGap,
    sheetH: reportHead + sheetTop + sheetGap + hubCardH + sheetGap + aiH + rs(14, scale),
    hPad,
    dockClearance,
    promoPad,
    promoRadius,
    promoTempSize: rs(
      promoInner >= rs(150, scale) ? 40 : promoInner >= rs(120, scale) ? 34 : 28,
      scale,
    ),
    promoTitleSize: rs(narrow ? 14 : promoInner >= rs(140, scale) ? 16 : 15, scale),
    /** Hero ichidagi matn/tugma — banner balandligi bilan birga kichrayadi. */
    promoUi: (() => {
      const k = clamp(promoInner / 168, 0.58, 1);
      return {
        k,
        back: clamp(Math.round(34 * k), 26, 34),
        backIcon: clamp(Math.round(18 * k), 14, 18),
        locIcon: clamp(Math.round(13 * k), 10, 13),
        locFs: clamp(Math.round(11 * k), 9, 11),
        locSubFs: clamp(Math.round(10 * k), 8, 10),
        locPadV: clamp(Math.round(5 * k), 3, 5),
        locPadH: clamp(Math.round(10 * k), 7, 10),
        tempFs: clamp(
          Math.round(
            (promoInner >= rs(150, scale) ? 40 : promoInner >= rs(120, scale) ? 34 : 28) * k,
          ),
          18,
          40,
        ),
        conditionFs: clamp(Math.round(15 * k), 11, 15),
        hintFs: clamp(Math.round(12 * k), 9, 12),
        btnFs: clamp(Math.round(13 * k), 10, 13),
        btnArrow: clamp(Math.round(15 * k), 11, 15),
        btnPadV: clamp(Math.round(9 * k), 5, 9),
        btnPadH: clamp(Math.round(14 * k), 9, 14),
        btnMinH: clamp(Math.round(36 * k), 26, 36),
        gap: clamp(Math.round(8 * k), 4, 8),
      };
    })(),
    /** CTA uchun minimal joy; hint/2-qator title uchun boyroq. */
    promoShowCta: promoInner >= rs(120, scale),
    promoRich: promoInner >= rs(152, scale),
    hubCardRich: hubCardH >= rs(130, scale),
    featuredRich: featuredH >= rs(124, scale),
    /**
     * Featured UI — karta kengligiga bog‘liq (ekran emas).
     * 200pt dizayn: btn 26 / title 13; 150pt: btn ~19 / title ~10.
     */
    featuredUi: (() => {
      const w = Math.max(120, featuredW);
      const k = clamp(w / 200, 0.5, 1);
      return {
        k,
        btn: clamp(Math.round(26 * k), 16, 26),
        play: clamp(Math.round(28 * k), 18, 28),
        icon: clamp(Math.round(13 * k), 9, 13),
        playIcon: clamp(Math.round(11 * k), 8, 11),
        durationIcon: clamp(Math.round(9 * k), 7, 9),
        durationFs: clamp(Math.round(10 * k), 8, 10),
        brandFs: clamp(Math.round(10 * k), 8, 10),
        titleFs: clamp(Math.round(13 * k), 9, 13),
        metaPadH: clamp(Math.round(10 * k), 6, 10),
        metaPadV: clamp(Math.round(7 * k), 4, 7),
        ctrlInset: clamp(Math.round(8 * k), 5, 8),
      };
    })(),
    quickActionUi: (() => {
      const w = Math.max(88, quickActionW);
      const k = clamp(w / 100, 0.55, 1);
      return {
        labelFs: clamp(Math.round(14 * k), 12, 15),
        pad: clamp(Math.round(8 * k), 6, 9),
      };
    })(),
  };
}

