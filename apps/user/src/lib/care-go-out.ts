import type { MyCareProduct } from "@/lib/api/care-products";

type Ctx = {
  condition: string;
  temp: number | null;
  humidity: number | null;
  wind: number | null;
};

export type GoOutItem = {
  id: string;
  title: string;
  howToUse: string;
  image: string;
  fromMyProduct?: boolean;
};

const IMG = {
  sunglasses: "/care/go-out/sunglasses.png",
  spf: "/care/go-out/spf.png",
  hat: "/care/go-out/hat.png",
  umbrella: "/care/go-out/umbrella.png",
  water: "/care/go-out/water.png",
  lightClothes: "/care/go-out/light-clothes.png",
  lipBalm: "/care/go-out/lip-balm.png",
  moisturizer: "/care/go-out/moisturizer.png",
  cooling: "/care/go-out/cooling.png",
  powerbank: "/care/go-out/powerbank.png",
  tissues: "/care/go-out/tissues.png",
  rainKit: "/care/go-out/rain-kit.png",
  winterSet: "/care/go-out/winter-set.png",
  hairTie: "/care/go-out/hair-tie.png",
  sanitizer: "/care/go-out/sanitizer.png",
  snack: "/care/go-out/snack.png",
  earbuds: "/care/go-out/earbuds.png",
};

function wet(ctx: Ctx) {
  return ["rain", "drizzle", "showers", "storm", "snow"].includes(ctx.condition);
}
function dryAir(ctx: Ctx) {
  return ctx.humidity != null && ctx.humidity < 40;
}
function humidAir(ctx: Ctx) {
  return ctx.humidity != null && ctx.humidity >= 65;
}
function hot(ctx: Ctx) {
  return ctx.temp != null && ctx.temp >= 28;
}
function cold(ctx: Ctx) {
  return ctx.temp != null && ctx.temp <= 8;
}

function findSpf(products: MyCareProduct[]) {
  const re = /\b(spf|sunscreen|quyosh\s*krem|uv\s*himoya|sun\s*cream)\b/i;
  return products.find((p) => re.test(`${p.name} ${p.brand} ${p.category} ${p.purpose_uz || ""}`)) || null;
}

export function buildGoOutSummary(ctx: Ctx): string {
  const parts: string[] = [];
  if (ctx.temp != null) {
    if (ctx.temp >= 32) parts.push("juda issiq");
    else if (ctx.temp >= 24) parts.push("iliq");
    else if (ctx.temp <= 5) parts.push("sovuq");
    else parts.push("mo‘tadil");
  }
  if (wet(ctx)) parts.push("yomg‘ir ehtimoli bor");
  else if (ctx.humidity != null && ctx.humidity <= 35) parts.push("havo quruq");
  if (ctx.wind != null && ctx.wind >= 25) parts.push("shamol kuchli");
  if (!parts.length) return "Bugun ob-havo barqaror — quyidagi vositalarni oling.";
  return `Bugun havo ${parts.join(", ")}. Chiqishdan oldin quyidagilarni oling.`;
}

export function buildGoOutKit(opts: Ctx & { uvIndex?: number | null; myProducts?: MyCareProduct[] }): GoOutItem[] {
  const ctx = opts;
  const items: GoOutItem[] = [];
  const isWet = wet(ctx);
  const isHot = hot(ctx);
  const isCold = cold(ctx);
  const uv = opts.uvIndex;
  const uvHigh = uv != null && uv >= 3;
  const windy = ctx.wind != null && ctx.wind >= 25;
  const spf = findSpf(opts.myProducts || []);

  if (isWet) {
    items.push({ id: "umbrella", title: "Soyabon", howToUse: "Sumkaga solib chiqing — yomg‘ir boshlansa ochib yuring.", image: IMG.umbrella });
    items.push({ id: "raincoat", title: "Yomg‘irplash / telefon qopchasi", howToUse: "Yengil yomg‘irplash va suv o‘tkazmaydigan qopcha.", image: IMG.rainKit });
  }
  if (ctx.condition === "snow" || isCold) {
    items.push({ id: "winter_set", title: "Sharf + qo‘lqop", howToUse: "Bo‘yin va qo‘llarni sovuqdan himoya qiling.", image: IMG.winterSet });
    if (isCold) items.push({ id: "jacket", title: "Issiq kurtka", howToUse: "Qatlamlab kiying — tashqi issiq kurtka.", image: IMG.winterSet });
  }
  if (uvHigh || ctx.condition === "clear" || ctx.condition === "mainly_clear" || isHot) {
    items.push({ id: "sunglasses", title: "Quyosh ko‘zoynagi", howToUse: "Ko‘zni UV va yorug‘likdan himoya qiling.", image: IMG.sunglasses });
    items.push({
      id: "sunscreen",
      title: spf ? spf.name : "Quyosh kremi (SPF)",
      howToUse: spf?.usage_uz?.trim() || "Chiqishdan 15 daqiqa oldin yuz va ochiq teriga surting.",
      image: spf?.image_url || IMG.spf,
      fromMyProduct: Boolean(spf),
    });
    items.push({ id: "hat", title: "Shlyapa / kepka", howToUse: "Bosh va yuzni to‘g‘ridan-to‘g‘ri quyoshdan yoping.", image: IMG.hat });
  }
  if (isHot || (ctx.temp != null && ctx.temp >= 26)) {
    items.push({ id: "water", title: "Suv idishi", howToUse: "Issiqda har 30–40 daqiqada iching.", image: IMG.water });
    items.push({ id: "light_clothes", title: "Yengil ochiq kiyim", howToUse: "Paxta yoki yengil mato — terlashni kamaytiradi.", image: IMG.lightClothes });
    items.push({ id: "cooling", title: "Mini ventilyator / so‘rg‘ich", howToUse: "Yuz va bo‘yinni salqinlantirish uchun oling.", image: IMG.cooling });
    items.push({ id: "powerbank", title: "Powerbank", howToUse: "Issiqda telefon tez tugaydi — zaryadlagich oling.", image: IMG.powerbank });
  }
  if (windy) items.push({ id: "tie_hair", title: "Soch bog‘ich", howToUse: "Kuchli shamolda sochni bog‘lab yuring.", image: IMG.hairTie });
  if (dryAir(ctx)) {
    items.push({ id: "lip_balm", title: "Lab balzami", howToUse: "Quruq havoda chiqishdan oldin balzam surting.", image: IMG.lipBalm });
    items.push({ id: "moisturizer", title: "Yuz namlovchi", howToUse: "SPF ostiga yengil moisturizer surting.", image: IMG.moisturizer });
  }
  if (humidAir(ctx) && !isWet) {
    items.push({ id: "tissue", title: "Salfetka / mendil", howToUse: "Namlikda terlash tez — salfetka oling.", image: IMG.tissues });
  }
  if (ctx.temp != null && ctx.temp >= 30) {
    items.push({ id: "shade_plan", title: "Soya / tanaffus", howToUse: "12:00–16:00 da ochiq quyoshda uzoq turmang.", image: IMG.hat });
    items.push({ id: "snack", title: "Yengil gazak", howToUse: "Issiqda energiya tushishi mumkin — meva yoki bar oling.", image: IMG.snack });
  }
  items.push({ id: "sanitizer", title: "Antiseptik", howToUse: "Qo‘lni tez tozalash uchun mini sprey.", image: IMG.sanitizer });
  items.push({ id: "earbuds", title: "Quloqchin / case", howToUse: "Yo‘lda chaqiruv uchun case bilan oling.", image: IMG.earbuds });

  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true))).slice(0, 14);
}

export function shieldImageForTag(tag?: string | null, id?: string | null): string {
  const key = `${tag || ""} ${id || ""}`.toLowerCase();
  const pick = (name: string) => `/care/weather-shield/${name}.png`;
  if (/leave/.test(key)) return pick("leave-in");
  if (/anti.?frizz|frizz/.test(key)) return pick("antifrizz");
  if (/argan|bonding.?oil/.test(key)) return pick("argan-oil");
  if (/scalp.?mass/.test(key)) return pick("scalp-massager");
  if (/detox|clarif/.test(key)) return pick("detox-shampoo");
  if (/silk.?hat|headwear|hat/.test(key)) return pick("silk-hat");
  if (/sulfate/.test(key)) return pick("sulfate-free");
  if (/peptide/.test(key)) return pick("peptide");
  if (/anti.?static|static/.test(key)) return pick("antistatic");
  if (/scrub|piling/.test(key)) return pick("scalp-scrub");
  if (/uv/.test(key)) return pick("uv-spray");
  return pick("leave-in");
}

const HERO: Record<string, string> = {
  clear: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80",
  mainly_clear: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80",
  partly_cloudy: "https://images.unsplash.com/photo-1501630834273-4b5604d9a5d6?auto=format&fit=crop&w=1400&q=80",
  overcast: "https://images.unsplash.com/photo-1499346030926-9af01ece1208?auto=format&fit=crop&w=1400&q=80",
  cloudy: "https://images.unsplash.com/photo-1499346030926-9af01ece1208?auto=format&fit=crop&w=1400&q=80",
  fog: "https://images.unsplash.com/photo-1487621167305-5d248087c724?auto=format&fit=crop&w=1400&q=80",
  drizzle: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1400&q=80",
  rain: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1400&q=80",
  showers: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1400&q=80",
  snow: "https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=1400&q=80",
  storm: "https://images.unsplash.com/photo-1605727216801-e27ce6d37b22?auto=format&fit=crop&w=1400&q=80",
};

export function weatherHeroFallback(condition: string): string {
  return HERO[condition] || "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=1400&q=80";
}
