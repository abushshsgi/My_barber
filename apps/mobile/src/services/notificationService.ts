import type { WeatherData, WeatherPushPayload } from "../types/weatherShield";
import { getWeatherAlerts, getWeatherHairRecommendations } from "./weatherRecommendationEngine";

/**
 * Builds a short morning push payload from the dominant weather threat.
 * Wire this into Expo Notifications / backend morning alert job.
 */
export function generateDailyWeatherPushPayload(
  weather: WeatherData,
): WeatherPushPayload {
  const alerts = getWeatherAlerts(weather);
  const top = alerts[0];
  const tip = getWeatherHairRecommendations(weather)[0];
  const city = weather.location?.trim() || "Shahar";

  if (!top) {
    return {
      title: `Morf Shield · ${city}`,
      body: "Bugungi soch checklist tayyor — 3 ta yengil qadamni belgilang ✨",
      threat: "daily_calm",
    };
  }

  switch (top.trigger) {
    case "high_uv_hot":
      return {
        title: `UV himoya · ${city}`,
        body:
          tip?.description?.slice(0, 120) ||
          "Issiq / yuqori UV — UV sprey, leave-in va shlyapa oling.",
        threat: "high_uv_hot",
      };
    case "high_humidity_rain":
      return {
        title: `Frizz ogohlantirish · ${city}`,
        body:
          tip?.description?.slice(0, 120) ||
          "Namlik yuqori — anti-frizz serum va bog‘lab yuring.",
        threat: "high_humidity_rain",
      };
    case "cold":
      return {
        title: `Sovuqdan himoya · ${city}`,
        body:
          tip?.description?.slice(0, 120) ||
          "Sovuq — ipak shlyapa va 5 daqiqa scalp massaji tavsiya etiladi.",
        threat: "cold",
      };
    case "high_wind":
      return {
        title: `Shamol · ${city}`,
        body:
          tip?.description?.slice(0, 120) ||
          "Kuchli shamol — o‘rim/bun va bonding moy bilan himoya qiling.",
        threat: "high_wind",
      };
    case "poor_aqi":
      return {
        title: `Havo sifati · ${city}`,
        body:
          tip?.description?.slice(0, 120) ||
          "AQI yuqori — detox shampun va bosh kiyimi tavsiya etiladi.",
        threat: "poor_aqi",
      };
    default:
      return {
        title: `Morf Shield · ${city}`,
        body: "Bugungi soch himoyasi tayyor — Morf AI da ko‘ring.",
        threat: "calm",
      };
  }
}
