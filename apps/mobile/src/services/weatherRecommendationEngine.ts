import type { ImageSourcePropType } from "react-native";
import type {
  HairRecommendation,
  WeatherAlert,
  WeatherData,
  WeatherShieldState,
} from "../types/weatherShield";

/** Local Soft Paper product shots for shield cards. */
export const SHIELD_IMAGES = {
  uvSpray: require("../../assets/care/weather-shield/uv-spray.png") as ImageSourcePropType,
  antifrizz: require("../../assets/care/weather-shield/antifrizz.png") as ImageSourcePropType,
  arganOil: require("../../assets/care/weather-shield/argan-oil.png") as ImageSourcePropType,
  scalpMassager: require("../../assets/care/weather-shield/scalp-massager.png") as ImageSourcePropType,
  detoxShampoo: require("../../assets/care/weather-shield/detox-shampoo.png") as ImageSourcePropType,
  silkHat: require("../../assets/care/weather-shield/silk-hat.png") as ImageSourcePropType,
  leaveIn: require("../../assets/care/weather-shield/leave-in.png") as ImageSourcePropType,
  sulfateFree: require("../../assets/care/weather-shield/sulfate-free.png") as ImageSourcePropType,
  peptide: require("../../assets/care/weather-shield/peptide.png") as ImageSourcePropType,
  antistatic: require("../../assets/care/weather-shield/antistatic.png") as ImageSourcePropType,
  scalpScrub: require("../../assets/care/weather-shield/scalp-scrub.png") as ImageSourcePropType,
  headerShield: require("../../assets/care/weather-shield/header-shield.png") as ImageSourcePropType,
};

/** productTag / id → local Soft Paper shot (API image bo‘lmasa). */
export function shieldImageForTag(
  tag?: string | null,
  id?: string | null,
): ImageSourcePropType | null {
  const key = `${tag || ""} ${id || ""}`.toLowerCase();
  if (/leave/.test(key)) return SHIELD_IMAGES.leaveIn;
  if (/anti.?frizz|frizz/.test(key)) return SHIELD_IMAGES.antifrizz;
  if (/argan|bonding.?oil/.test(key)) return SHIELD_IMAGES.arganOil;
  if (/scalp.?mass/.test(key)) return SHIELD_IMAGES.scalpMassager;
  if (/detox|clarif/.test(key)) return SHIELD_IMAGES.detoxShampoo;
  if (/silk.?hat|headwear|hat-uv|hat\b/.test(key)) return SHIELD_IMAGES.silkHat;
  if (/sulfate/.test(key)) return SHIELD_IMAGES.sulfateFree;
  if (/peptide/.test(key)) return SHIELD_IMAGES.peptide;
  if (/anti.?static|static/.test(key)) return SHIELD_IMAGES.antistatic;
  if (/scrub|piling/.test(key)) return SHIELD_IMAGES.scalpScrub;
  if (/uv.?spray|uv-spray|\buv\b/.test(key)) return SHIELD_IMAGES.uvSpray;
  return null;
}

function n(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

/**
 * Evaluates weather against Smart Weather Shield rules and returns
 * prioritized hair-care recommendations (style / product / routine).
 */
export function getWeatherHairRecommendations(
  weather: WeatherData,
): HairRecommendation[] {
  const temp = n(weather.temp);
  const humidity = n(weather.humidity);
  const uv = n(weather.uvIndex);
  const wind = n(weather.windSpeed);
  const aqi = n(weather.aqi);
  const rainy = /rain|drizzle|shower|storm|yomg/i.test(weather.condition || "");

  const out: HairRecommendation[] = [];

  // 1) High UV / Hot — keratin + moisture risk
  if ((uv != null && uv >= 6) || (temp != null && temp >= 28)) {
    out.push(
      {
        id: "uv-spray",
        type: "product",
        title: "UV himoya sprey",
        description:
          "Chiqishdan oldin sochga UV-protection sprey surting — keratin va namlikni saqlaydi.",
        priority: 1,
        icon: "sunny-outline",
        productTag: "uv-spray",
        image: SHIELD_IMAGES.uvSpray,
        trigger: "high_uv_hot",
      },
      {
        id: "leave-in",
        type: "product",
        title: "Leave-in konditsioner",
        description:
          "Issiq / yuqori UV da leave-in bilan namlikni ushlang — scalp qurimasin.",
        priority: 2,
        icon: "water-outline",
        productTag: "leave-in",
        image: SHIELD_IMAGES.leaveIn,
        trigger: "high_uv_hot",
      },
      {
        id: "hat-uv",
        type: "style",
        title: "Shlyapa / kepka",
        description:
          "To‘g‘ridan-to‘g‘ri quyoshdan bosh va sochni yoping — issiq urishini kamaytiradi.",
        priority: 2,
        icon: "sunny-outline",
        productTag: "hat",
        image: SHIELD_IMAGES.silkHat,
        trigger: "high_uv_hot",
      },
      {
        id: "argan-ends",
        type: "routine",
        title: "Uchlarga argan moyi",
        description:
          "Soch uchlariga 1–2 tomchi argan moyi — namlik yo‘qolishi va yorilishni oldini oladi.",
        priority: 3,
        icon: "leaf-outline",
        productTag: "argan-oil",
        image: SHIELD_IMAGES.arganOil,
        trigger: "high_uv_hot",
      },
    );
  }

  // 2) High humidity / rain — frizz
  if ((humidity != null && humidity >= 70) || rainy) {
    out.push(
      {
        id: "antifrizz",
        type: "product",
        title: "Anti-frizz serum",
        description:
          "Namlikda frizzni ushlash uchun silikon asosli himoya barrier serum surting.",
        priority: 1,
        icon: "cloudy-outline",
        productTag: "anti-frizz",
        image: SHIELD_IMAGES.antifrizz,
        trigger: "high_humidity_rain",
      },
      {
        id: "tie-up",
        type: "style",
        title: "Bog‘lab yuring",
        description:
          "Bun / o‘rim / pony — namlik soch strukturasini buzmasin.",
        priority: 2,
        icon: "cut-outline",
        productTag: "protective-style",
        trigger: "high_humidity_rain",
      },
      {
        id: "sulfate-free",
        type: "product",
        title: "Sulfatsiz namlovchi shampun",
        description:
          "Keyingi yuvishda sulfatsiz hydrating shampun — ortiqcha namlikdan keyin muvozanat.",
        priority: 3,
        icon: "flask-outline",
        productTag: "sulfate-free-shampoo",
        image: SHIELD_IMAGES.sulfateFree,
        trigger: "high_humidity_rain",
      },
    );
  }

  // 3) Cold / freezing — circulation + breakage
  if (temp != null && temp <= 5) {
    out.push(
      {
        id: "silk-hat",
        type: "style",
        title: "Ipak / satin shlyapa",
        description:
          "Qishki kiyim ishqalanishini kamaytirish uchun silk/satin-lined shlyapa tanlang.",
        priority: 1,
        icon: "snow-outline",
        productTag: "silk-hat",
        image: SHIELD_IMAGES.silkHat,
        trigger: "cold",
      },
      {
        id: "scalp-massage",
        type: "routine",
        title: "5 daqiqa scalp massaji",
        description:
          "Scalp massager bilan qon aylanishini yaxshilang — follikulalarni qo‘llab-quvvatlaydi.",
        priority: 2,
        icon: "hand-left-outline",
        productTag: "scalp-massager",
        image: SHIELD_IMAGES.scalpMassager,
        trigger: "cold",
      },
      {
        id: "peptide-serum",
        type: "product",
        title: "O‘sish / peptide serum",
        description:
          "Sovuqda oziqlantiruvchi peptide serum — sochni zaiflashishdan himoya qiladi.",
        priority: 2,
        icon: "fitness-outline",
        productTag: "peptide-serum",
        image: SHIELD_IMAGES.peptide,
        trigger: "cold",
      },
    );
  }

  // 4) High wind — tangling / breakage
  if (wind != null && wind >= 20) {
    out.push(
      {
        id: "braid-bun",
        type: "style",
        title: "Himoya uslubi (o‘rim / bun)",
        description:
          "Shamolda chalkashish va mexanik sindirishni kamaytirish uchun sochni bog‘lang.",
        priority: 1,
        icon: "flag-outline",
        productTag: "protective-style",
        trigger: "high_wind",
      },
      {
        id: "antistatic",
        type: "product",
        title: "Anti-static smoothing sprey",
        description:
          "Statik va chalkashishga qarshi yengil smoothing sprey ishlating.",
        priority: 2,
        icon: "flash-outline",
        productTag: "anti-static-spray",
        image: SHIELD_IMAGES.antistatic,
        trigger: "high_wind",
      },
      {
        id: "bonding-oil",
        type: "product",
        title: "Bonding / himoya moyi",
        description:
          "Uchlarga bonding oil (masalan Olaplex No.7 tipidagi) — split ends oldini oladi.",
        priority: 2,
        icon: "shield-checkmark-outline",
        productTag: "bonding-oil",
        image: SHIELD_IMAGES.arganOil,
        trigger: "high_wind",
      },
    );
  }

  // 5) Poor AQI / dust — clogged scalp
  if (aqi != null && aqi >= 100) {
    out.push(
      {
        id: "scalp-scrub",
        type: "routine",
        title: "Scalp scrub (piling)",
        description:
          "Kechqurun yumshoq scalp scrub — chang va mikrozarrachalarni tozalaydi.",
        priority: 1,
        icon: "sparkles-outline",
        productTag: "scalp-scrub",
        image: SHIELD_IMAGES.scalpScrub,
        trigger: "poor_aqi",
      },
      {
        id: "detox-shampoo",
        type: "product",
        title: "Clarifying detox shampun",
        description:
          "Haftada 1× detox / clarifying shampun — sebum va chang muvozanatini tiklaydi.",
        priority: 2,
        icon: "flask-outline",
        productTag: "detox-shampoo",
        image: SHIELD_IMAGES.detoxShampoo,
        trigger: "poor_aqi",
      },
      {
        id: "headwear-aqi",
        type: "style",
        title: "Himoya bosh kiyimi",
        description:
          "Changli havoda shlyapa yoki sharf — soch va scalpni zarrachalardan yoping.",
        priority: 2,
        icon: "shield-outline",
        productTag: "protective-headwear",
        image: SHIELD_IMAGES.silkHat,
        trigger: "poor_aqi",
      },
    );
  }

  // Yumshoq kun — baribir kunlik checklist (har kuni galochka)
  if (out.length === 0) {
    out.push(
      {
        id: "daily-hydrate",
        type: "product",
        title: "Yengil namlantirish",
        description:
          "Bugun ob-havo yumshoq — leave-in yoki engil sprey bilan namlikni yangilang.",
        priority: 1,
        icon: "water-outline",
        productTag: "leave-in",
        image: SHIELD_IMAGES.leaveIn,
        trigger: "daily_calm",
      },
      {
        id: "daily-scalp",
        type: "routine",
        title: "1 daqiqa scalp massaji",
        description:
          "Barmoq uchlari bilan 60 soniya yumshoq massaj — qon aylanishi va porloqlik uchun.",
        priority: 2,
        icon: "hand-left-outline",
        productTag: "scalp-massager",
        image: SHIELD_IMAGES.scalpMassager,
        trigger: "daily_calm",
      },
      {
        id: "daily-ends",
        type: "routine",
        title: "Uchlarni tekshirish",
        description:
          "Soch uchlariga 1 tomchi moy — quruqlik va yorilishni oldini oladi.",
        priority: 3,
        icon: "leaf-outline",
        productTag: "argan-oil",
        image: SHIELD_IMAGES.arganOil,
        trigger: "daily_calm",
      },
    );
  }

  // Dedupe by id, sort by priority
  const seen = new Set<string>();
  return out
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

/** Build alert badges from active recommendation triggers. */
export function getWeatherAlerts(weather: WeatherData): WeatherAlert[] {
  const recs = getWeatherHairRecommendations(weather);
  const triggers = new Set(recs.map((r) => r.trigger));
  const alerts: WeatherAlert[] = [];

  if (triggers.has("high_uv_hot")) {
    alerts.push({
      id: "alert-uv",
      label: "Yuqori UV / issiq",
      severity: "high",
      trigger: "high_uv_hot",
    });
  }
  if (triggers.has("high_humidity_rain")) {
    alerts.push({
      id: "alert-humidity",
      label: "Namlik / yomg‘ir",
      severity: "medium",
      trigger: "high_humidity_rain",
    });
  }
  if (triggers.has("cold")) {
    alerts.push({
      id: "alert-cold",
      label: "Sovuq havo",
      severity: "high",
      trigger: "cold",
    });
  }
  if (triggers.has("high_wind")) {
    alerts.push({
      id: "alert-wind",
      label: "Kuchli shamol",
      severity: "medium",
      trigger: "high_wind",
    });
  }
  if (triggers.has("poor_aqi")) {
    alerts.push({
      id: "alert-aqi",
      label: "Havo sifati past",
      severity: "high",
      trigger: "poor_aqi",
    });
  }
  return alerts;
}

/** Assemble full shield state from a weather snapshot. */
export function buildWeatherShieldState(
  weather: WeatherData | null,
  opts?: { loading?: boolean; error?: string | null },
): WeatherShieldState {
  if (!weather) {
    return {
      currentWeather: null,
      activeAlerts: [],
      recommendations: [],
      loading: opts?.loading,
      error: opts?.error ?? null,
    };
  }
  return {
    currentWeather: weather,
    activeAlerts: getWeatherAlerts(weather),
    recommendations: getWeatherHairRecommendations(weather),
    loading: opts?.loading,
    error: opts?.error ?? null,
  };
}
