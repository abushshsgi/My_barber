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
  // Tor/past telefonlarda kuchliroq ixchamlash; Pro Max'da yumshoq o'sish.
  const w = clamp(width / BASE_W, 0.68, 1.14);
  const h = clamp(height / BASE_H, 0.68, 1.1);
  return clamp(Math.min(w, h), 0.68, 1.12);
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

/** Uydan chiqishda ob-havoga mos olinadigan vositalar. */
export type GoOutKitItem = {
  id: string;
  icon: string;
  title: string;
  howToUse: string;
  accent: string;
  /** Mahalliy yoki remote rasm */
  image?: ImageSourcePropType | null;
  /** Foydalanuvchi mahsulotidan (masalan SPF) */
  fromMyProduct?: boolean;
  productName?: string | null;
};

export const GO_OUT_IMAGES = {
  sunglasses: require("../../assets/care/go-out/sunglasses.png") as ImageSourcePropType,
  spf: require("../../assets/care/go-out/spf.png") as ImageSourcePropType,
  hat: require("../../assets/care/go-out/hat.png") as ImageSourcePropType,
  umbrella: require("../../assets/care/go-out/umbrella.png") as ImageSourcePropType,
  water: require("../../assets/care/go-out/water.png") as ImageSourcePropType,
  lightClothes: require("../../assets/care/go-out/light-clothes.png") as ImageSourcePropType,
  lipBalm: require("../../assets/care/go-out/lip-balm.png") as ImageSourcePropType,
  moisturizer: require("../../assets/care/go-out/moisturizer.png") as ImageSourcePropType,
  cooling: require("../../assets/care/go-out/cooling.png") as ImageSourcePropType,
  powerbank: require("../../assets/care/go-out/powerbank.png") as ImageSourcePropType,
  tissues: require("../../assets/care/go-out/tissues.png") as ImageSourcePropType,
  rainKit: require("../../assets/care/go-out/rain-kit.png") as ImageSourcePropType,
  winterSet: require("../../assets/care/go-out/winter-set.png") as ImageSourcePropType,
  hairTie: require("../../assets/care/go-out/hair-tie.png") as ImageSourcePropType,
  sanitizer: require("../../assets/care/go-out/sanitizer.png") as ImageSourcePropType,
  snack: require("../../assets/care/go-out/snack.png") as ImageSourcePropType,
  earbuds: require("../../assets/care/go-out/earbuds.png") as ImageSourcePropType,
};

/** Mening mahsulotlarimdan SPF / quyosh kremi. */
export function findSpfMyProduct(products: MyCareProduct[]): MyCareProduct | null {
  const re =
    /\b(spf|sunscreen|sun\s*screen|quyosh\s*krem|uv\s*himoya|uv\s*protect|sun\s*cream|blokator)\b/i;
  for (const p of products) {
    const blob = `${p.name} ${p.brand} ${p.category} ${p.purpose_uz || ""} ${p.usage_uz || ""}`;
    if (re.test(blob)) return p;
  }
  return null;
}

function uvLevel(index: number | null | undefined): string {
  if (index == null || Number.isNaN(index)) return "unknown";
  if (index >= 11) return "extreme";
  if (index >= 8) return "very_high";
  if (index >= 6) return "high";
  if (index >= 3) return "moderate";
  return "low";
}

export function buildGoOutKit(opts: {
  condition: WeatherConditionKey;
  temp: number | null;
  humidity: number | null;
  wind: number | null;
  uvIndex?: number | null;
  myProducts?: MyCareProduct[];
}): GoOutKitItem[] {
  const { condition, temp, humidity, wind, uvIndex, myProducts = [] } = opts;
  const items: GoOutKitItem[] = [];
  const isWet = wet({ condition, temp, humidity, wind });
  const isHot = hot({ condition, temp, humidity, wind });
  const isCold = cold({ condition, temp, humidity, wind });
  const uv = uvLevel(uvIndex);
  const uvHigh = uv === "high" || uv === "very_high" || uv === "extreme" || uv === "moderate";
  const windy = wind != null && wind >= 25;
  const dry = dryAir({ condition, temp, humidity, wind });
  const humid = humidAir({ condition, temp, humidity, wind });
  const spfProduct = findSpfMyProduct(myProducts);
  const spfImage: ImageSourcePropType =
    spfProduct?.image_url
      ? ({ uri: spfProduct.image_url } as ImageSourcePropType)
      : GO_OUT_IMAGES.spf;

  if (isWet) {
    items.push({
      id: "umbrella",
      icon: "umbrella-outline",
      title: "Soyabon",
      howToUse: "Sumkaga solib chiqing — yomg‘ir boshlansa ochib yuring, kiyim quruq qoladi.",
      accent: "#2563EB",
      image: GO_OUT_IMAGES.umbrella,
    });
    items.push({
      id: "raincoat",
      icon: "shirt-outline",
      title: "Yomg‘irplash / telefon qopchasi",
      howToUse: "Yengil yomg‘irplash va suv o‘tkazmaydigan qopcha — kiyim va telefon quruq qoladi.",
      accent: "#1D4ED8",
      image: GO_OUT_IMAGES.rainKit,
    });
  }

  if (condition === "snow" || isCold) {
    items.push({
      id: "winter_set",
      icon: "snow-outline",
      title: "Sharf + qo‘lqop",
      howToUse: "Bo‘yin va qo‘llarni sovuqdan himoya qiling — chiqishdan oldin kiyib oling.",
      accent: "#64748B",
      image: GO_OUT_IMAGES.winterSet,
    });
    if (isCold) {
      items.push({
        id: "jacket",
        icon: "shirt-outline",
        title: "Issiq kurtka",
        howToUse: "Qatlamlab kiying — tashqi issiq kurtka, ichida yengil kiyim.",
        accent: "#0F172A",
        image: GO_OUT_IMAGES.winterSet,
      });
    }
  }

  if (uvHigh || condition === "clear" || condition === "mainly_clear" || isHot) {
    items.push({
      id: "sunglasses",
      icon: "eye-outline",
      title: "Quyosh ko‘zoynagi",
      howToUse: "Ko‘zni UV va yorug‘likdan himoya qiling — chiqishda darhol taqing.",
      accent: "#EA580C",
      image: GO_OUT_IMAGES.sunglasses,
    });
    items.push({
      id: "sunscreen",
      icon: "shield-checkmark-outline",
      title: spfProduct ? spfProduct.name : "Quyosh kremi (SPF)",
      howToUse: spfProduct
        ? `${spfProduct.usage_uz?.trim() || "Chiqishdan 15 daqiqa oldin yuz va ochiq teriga surting."}${spfProduct.brand ? ` · ${spfProduct.brand}` : ""}`
        : "Chiqishdan 15 daqiqa oldin yuz, bo‘yin va qo‘llarga surting.",
      accent: "#F59E0B",
      image: spfImage,
      fromMyProduct: Boolean(spfProduct),
      productName: spfProduct?.name ?? null,
    });
    items.push({
      id: "hat",
      icon: "sunny-outline",
      title: "Shlyapa / kepka",
      howToUse: "Bosh va yuzni to‘g‘ridan-to‘g‘ri quyoshdan yoping — issiq urishni kamaytiradi.",
      accent: "#D97706",
      image: GO_OUT_IMAGES.hat,
    });
  }

  if (isHot || (temp != null && temp >= 26)) {
    items.push({
      id: "water",
      icon: "water-outline",
      title: "Suv idishi",
      howToUse: "Yo‘lda ichish uchun suv oling — issiqda har 30–40 daqiqada iching.",
      accent: "#0EA5E9",
      image: GO_OUT_IMAGES.water,
    });
    items.push({
      id: "light_clothes",
      icon: "shirt-outline",
      title: "Yengil ochiq kiyim",
      howToUse: "Paxta yoki yengil mato — terlash va qizarishni kamaytiradi.",
      accent: "#0284C7",
      image: GO_OUT_IMAGES.lightClothes,
    });
    items.push({
      id: "cooling",
      icon: "snow-outline",
      title: "Mini ventilyator / so‘rg‘ich",
      howToUse: "Issiqda yuz va bo‘yinni salqinlantirish uchun oling.",
      accent: "#06B6D4",
      image: GO_OUT_IMAGES.cooling,
    });
    items.push({
      id: "powerbank",
      icon: "battery-half-outline",
      title: "Powerbank",
      howToUse: "Issiqda navigatsiya/telefon tez tugaydi — zaryadlagich oling.",
      accent: "#334155",
      image: GO_OUT_IMAGES.powerbank,
    });
  }

  if (windy) {
    items.push({
      id: "tie_hair",
      icon: "cut-outline",
      title: "Soch bog‘ich",
      howToUse: "Kuchli shamolda chalkashishni kamaytirish uchun sochni bog‘lab yuring.",
      accent: "#4F46E5",
      image: GO_OUT_IMAGES.hairTie,
    });
  }

  if (dry) {
    items.push({
      id: "lip_balm",
      icon: "happy-outline",
      title: "Lab balzami",
      howToUse: "Quruq havoda lablar yoriladi — chiqishdan oldin balzam surting.",
      accent: "#EC4899",
      image: GO_OUT_IMAGES.lipBalm,
    });
    items.push({
      id: "moisturizer",
      icon: "water-outline",
      title: "Yuz namlovchi",
      howToUse: "SPF ostiga yengil moisturizer — terini qurib ketishdan saqlaydi.",
      accent: "#DB2777",
      image: GO_OUT_IMAGES.moisturizer,
    });
  }

  if (humid && !isWet) {
    items.push({
      id: "tissue",
      icon: "document-outline",
      title: "Salfetka / mendil",
      howToUse: "Namlikda terlash tez — salfetka oling, yuzni yumshoq artib turing.",
      accent: "#14B8A6",
      image: GO_OUT_IMAGES.tissues,
    });
  }

  if (condition === "fog") {
    items.push({
      id: "bright",
      icon: "flashlight-outline",
      title: "Yorqin kiyim / chiroq",
      howToUse: "Ko‘rinish past — yorqinroq kiyim yoki telefon chirog‘ini tayyor tuting.",
      accent: "#A855F7",
      image: GO_OUT_IMAGES.lightClothes,
    });
  }

  if (temp != null && temp >= 30) {
    items.push({
      id: "shade_plan",
      icon: "leaf-outline",
      title: "Soya / tanaffus",
      howToUse: "12:00–16:00 oralig‘ida ochiq quyoshda uzoq turmang — soyaga o‘ting.",
      accent: "#65A30D",
      image: GO_OUT_IMAGES.hat,
    });
    items.push({
      id: "snack",
      icon: "nutrition-outline",
      title: "Yengil gazak",
      howToUse: "Issiqda energiya tushishi mumkin — meva yoki bar oling.",
      accent: "#CA8A04",
      image: GO_OUT_IMAGES.snack,
    });
  }

  // Har kuni foydali asosiy narsalar
  items.push({
    id: "sanitizer",
    icon: "shield-outline",
    title: "Antiseptik",
    howToUse: "Qo‘lni tez tozalash uchun mini sprey — transport va do‘konlarda.",
    accent: "#0D9488",
    image: GO_OUT_IMAGES.sanitizer,
  });
  items.push({
    id: "earbuds",
    icon: "headset-outline",
    title: "Quloqchin / case",
    howToUse: "Yo‘lda podcast yoki chaqiruv uchun — case bilan oling.",
    accent: "#475569",
    image: GO_OUT_IMAGES.earbuds,
  });

  if (!items.length) {
    items.push({
      id: "casual",
      icon: "checkmark-circle-outline",
      title: "Oddiy kiyim yetarli",
      howToUse: "Ob-havo yumshoq — oddiy kiyim bilan chiqing, ortiqcha yuk olmang.",
      accent: "#16A34A",
      image: GO_OUT_IMAGES.lightClothes,
    });
  }

  const seen = new Set<string>();
  const unique = items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  return unique.slice(0, 14);
}

/** Uydan chiqish uchun qisqa ob-havo xulosasi (soch emas). */
export function buildGoOutSummary(opts: {
  condition: WeatherConditionKey;
  temp: number | null;
  humidity: number | null;
  wind: number | null;
}): string {
  const parts: string[] = [];
  if (opts.temp != null) {
    if (opts.temp >= 32) parts.push("juda issiq");
    else if (opts.temp >= 24) parts.push("iliq");
    else if (opts.temp <= 5) parts.push("sovuq");
    else parts.push("mo‘tadil");
  }
  if (wet({ condition: opts.condition, temp: opts.temp, humidity: opts.humidity, wind: opts.wind })) {
    parts.push("yomg‘ir ehtimoli bor");
  } else if (opts.humidity != null && opts.humidity <= 35) {
    parts.push("havo quruq");
  }
  if (opts.wind != null && opts.wind >= 25) parts.push("shamol kuchli");
  if (!parts.length) return "Bugun ob-havo barqaror — quyidagi vositalarni oling.";
  return `Bugun havo ${parts.join(", ")}. Chiqishdan oldin quyidagilarni oling.`;
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
  const short = height < 700;
  const tiny = height < 640;
  const narrow = width < 360;
  const tall = height >= 900;

  /** Floating tab dock yo‘q — Android nav / home indicator ustida qolsin. */
  const dockClearance = Math.max(bottomInset, 32) + (short ? 14 : 18);
  const avail = Math.max(320, height - dockClearance - Math.max(topInset, 0));

  const density = tiny ? 0.86 : short ? 0.92 : tall ? 1.04 : 1;
  const gapScale = tiny ? 0.72 : short ? 0.82 : 1;

  const searchH = rs(Math.round(40 * density), scale);
  const searchBlock = searchH + rs(Math.round(18 * gapScale), scale);
  const reportHead = rs(Math.round(22 * density), scale);
  const sheetTop = rs(Math.round(12 * density), scale);
  const promoTopGap = rs(Math.round((short ? 4 : 8) * gapScale), scale);
  const weatherNudge = rs(Math.round(4 * gapScale), scale);
  const searchCatGap = rs(Math.round((short ? 10 : 14) * gapScale), scale);
  const sectionGap = rs(Math.round((short ? 8 : 12) * gapScale), scale);
  const gaps = rs(Math.round(14 * gapScale), scale) + weatherNudge + searchCatGap + sectionGap;

  const hPad = narrow ? Math.max(10, rs(12, scale)) : width < 400 ? rs(14, scale) : rs(16, scale);
  /** Wide web/tablet: banner telefon kengligida qolsin (835px stretch emas). */
  const promoMaxW = Math.min(Math.max(220, width - 2 * hPad), rs(400, scale));

  const quickSlots = 3.45;
  const quickActionWCap =
    narrow ? rs(Math.round(100 * density), scale)
      : width < 400 ? rs(Math.round(112 * density), scale)
      : rs(Math.round(124 * density), scale);
  const quickActionW = clamp(
    Math.round((width - hPad * 2 - rs(16, scale)) / quickSlots),
    narrow ? rs(Math.round(84 * density), scale) : rs(Math.round(92 * density), scale),
    quickActionWCap,
  );
  const quickActionH = clamp(
    Math.round(quickActionW * (short ? 0.98 : 1.02)),
    narrow ? rs(Math.round(84 * density), scale) : rs(Math.round(92 * density), scale),
    short ? rs(Math.round(108 * density), scale) : rs(Math.round(118 * density), scale),
  );
  const quickActionBlock = quickActionH + sectionGap;

  const chrome = searchBlock + quickActionBlock + reportHead + gaps + sheetTop + promoTopGap;
  const remain = Math.max(rs(240, scale), avail - chrome);

  const promoW = promoMaxW;
  /** Androidda viloyat rasmlari konteynerga to‘liq yopsin — biroz balandroq promo. */
  const PROMO_ASPECT = short ? 2.15 : 2.0;
  const promoByWidth = Math.round(promoW / PROMO_ASPECT);

  /** AI Assistant qatori olib tashlangan — joy promo + kartochkalarga beriladi. */
  const MIN = {
    promo: Math.max(rs(Math.round(110 * density), scale), Math.min(promoByWidth, rs(Math.round(140 * density), scale))),
    featured: rs(Math.round((narrow ? 104 : 122) * density), scale),
    hubCard: rs(Math.round((short ? 148 : 172) * density), scale),
  };
  const MAX = {
    promo: clamp(
      Math.max(rs(Math.round(124 * density), scale), promoByWidth),
      rs(Math.round(116 * density), scale),
      Math.min(rs(Math.round(172 * density), scale), Math.round(height * (short ? 0.22 : 0.25))),
    ),
    featured: rs(Math.round((short ? 142 : 158) * density), scale),
    hubCard: rs(Math.round((short ? 200 : 228) * density), scale),
  };

  const minTotal = MIN.promo + MIN.featured + MIN.hubCard;
  const headroom =
    MAX.promo - MIN.promo +
    (MAX.featured - MIN.featured) +
    (MAX.hubCard - MIN.hubCard);

  let promoH: number;
  let featuredH: number;
  let hubCardH: number;

  if (remain <= minTotal) {
    const k = remain / minTotal;
    promoH = Math.floor(MIN.promo * k);
    featuredH = Math.floor(MIN.featured * k);
    hubCardH = Math.max(1, remain - promoH - featuredH);
  } else {
    const k = headroom > 0 ? Math.min(1, (remain - minTotal) / headroom) : 0;
    const grow = (min: number, max: number) => Math.round(min + (max - min) * k);
    promoH = grow(MIN.promo, MAX.promo);
    featuredH = grow(MIN.featured, MAX.featured);
    hubCardH = grow(MIN.hubCard, MAX.hubCard);
  }
  const aiH = 0;

  const featuredWCap =
    narrow ? rs(Math.round(122 * density), scale)
      : width < 400 ? rs(Math.round(140 * density), scale)
      : rs(Math.round(162 * density), scale);
  const featuredW = clamp(
    Math.round(featuredH * 0.88),
    narrow ? rs(Math.round(98 * density), scale) : rs(Math.round(112 * density), scale),
    featuredWCap,
  );
  const sheetGap = rs(Math.round((short ? 8 : 12) * density), scale);
  const promoInner = promoH;
  const promoPad = narrow ? Math.max(14, rs(14, scale)) : width < 400 ? rs(16, scale) : rs(18, scale);
  const promoRadius = narrow ? Math.max(16, rs(18, scale)) : rs(22, scale);

  return {
    scale,
    density,
    short,
    tiny,
    narrow,
    avail,
    hubCardH,
    aiH,
    promoH,
    featuredH,
    featuredW,
    searchBlock,
    searchH,
    sectionGap,
    quickActionW,
    quickActionH,
    quickActionBlock,
    weatherNudge,
    searchCatGap,
    promoTopGap,
    sheetTop,
    sheetGap,
    sheetH: reportHead + sheetTop + sheetGap + hubCardH + rs(Math.round(12 * density), scale),
    hPad,
    promoMaxW,
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
      const k = clamp(promoInner / (short ? 148 : 168), 0.52, 1) * density;
      return {
        k,
        back: clamp(Math.round(34 * k), 24, 34),
        backIcon: clamp(Math.round(18 * k), 13, 18),
        locIcon: clamp(Math.round(13 * k), 10, 13),
        locFs: clamp(Math.round(11 * k), 9, 11),
        locSubFs: clamp(Math.round(10 * k), 8, 10),
        locPadV: clamp(Math.round(5 * k), 3, 5),
        locPadH: clamp(Math.round(10 * k), 7, 10),
        tempFs: clamp(
          Math.round(
            (promoInner >= rs(150, scale) ? 40 : promoInner >= rs(120, scale) ? 34 : 28) * k,
          ),
          16,
          40,
        ),
        conditionFs: clamp(Math.round(15 * k), 10, 15),
        hintFs: clamp(Math.round(12 * k), 9, 12),
        btnFs: clamp(Math.round(13 * k), 10, 13),
        btnArrow: clamp(Math.round(15 * k), 11, 15),
        btnPadV: clamp(Math.round(9 * k), 5, 9),
        btnPadH: clamp(Math.round(14 * k), 8, 14),
        btnMinH: clamp(Math.round(36 * k), 24, 36),
        gap: clamp(Math.round(8 * k), 3, 8),
      };
    })(),
    promoShowCta: promoInner >= rs(short ? 108 : 120, scale),
    promoRich: promoInner >= rs(short ? 136 : 152, scale),
    hubCardRich: hubCardH >= rs(short ? 132 : 150, scale),
    featuredRich: featuredH >= rs(short ? 104 : 118, scale),
    featuredUi: (() => {
      const w = Math.max(100, featuredW);
      const k = clamp(w / 200, 0.48, 1) * density;
      return {
        k,
        btn: clamp(Math.round(26 * k), 15, 26),
        play: clamp(Math.round(28 * k), 17, 28),
        icon: clamp(Math.round(13 * k), 8, 13),
        playIcon: clamp(Math.round(11 * k), 7, 11),
        durationIcon: clamp(Math.round(9 * k), 6, 9),
        durationFs: clamp(Math.round(10 * k), 7, 10),
        brandFs: clamp(Math.round(10 * k), 7, 10),
        titleFs: clamp(Math.round(13 * k), 8, 13),
        metaPadH: clamp(Math.round(10 * k), 5, 10),
        metaPadV: clamp(Math.round(7 * k), 3, 7),
        ctrlInset: clamp(Math.round(8 * k), 4, 8),
      };
    })(),
    quickActionUi: (() => {
      const w = Math.max(76, quickActionW);
      const k = clamp(w / 100, 0.5, 1) * density;
      return {
        labelFs: clamp(Math.round(14 * k), 11, 15),
        pad: clamp(Math.round(8 * k), 5, 9),
      };
    })(),
    searchUi: (() => {
      const k = clamp(searchH / 42, 0.72, 1.08);
      return {
        h: searchH,
        icon: clamp(Math.round(16 * k), 13, 17),
        filterIcon: clamp(Math.round(13 * k), 11, 14),
        tail: clamp(Math.round(32 * k), 26, 34),
        fs: clamp(Math.round(13 * k), 11, 14),
        padL: clamp(Math.round(12 * k), 9, 14),
        padR: clamp(Math.round(4 * k), 3, 6),
      };
    })(),
    sheetUi: (() => {
      const k = clamp(hubCardH / 160, 0.7, 1.05) * density;
      return {
        filterFs: clamp(Math.round(11 * k), 9, 12),
        filterIcon: clamp(Math.round(13 * k), 11, 14),
        filterPadH: clamp(Math.round(9 * k), 7, 11),
        filterPadV: clamp(Math.round(5 * k), 3, 7),
        cardTitleFs: clamp(Math.round(14 * k), 11, 15),
        cardMetricFs: clamp(Math.round(11 * k), 9, 12),
        statusFs: clamp(Math.round(10 * k), 8, 11),
      };
    })(),
  };
}

