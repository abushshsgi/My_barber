import type { ImageSourcePropType } from "react-native";

/** Real-time weather snapshot for Smart Weather Shield. */
export type WeatherData = {
  temp: number | null;
  humidity: number | null;
  uvIndex: number | null;
  windSpeed: number | null;
  /** Air Quality Index — optional if API does not provide it. */
  aqi: number | null;
  location: string;
  condition: string;
};

export type HairRecommendationType = "style" | "product" | "routine";

export type HairRecommendation = {
  id: string;
  type: HairRecommendationType;
  title: string;
  description: string;
  /** Lower = higher urgency (1 is top). */
  priority: number;
  icon: string;
  productTag?: string;
  /** Optional product / tool image for the card. */
  image?: ImageSourcePropType | null;
  /** Weather rule that triggered this tip. */
  trigger:
    | "high_uv_hot"
    | "high_humidity_rain"
    | "cold"
    | "high_wind"
    | "poor_aqi"
    | "daily_calm";
};

export type WeatherAlert = {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  trigger: HairRecommendation["trigger"];
};

export type WeatherShieldState = {
  currentWeather: WeatherData | null;
  activeAlerts: WeatherAlert[];
  recommendations: HairRecommendation[];
  loading?: boolean;
  error?: string | null;
};

export type WeatherPushPayload = {
  title: string;
  body: string;
  /** Dominant threat key for analytics / deep-link. */
  threat: HairRecommendation["trigger"] | "calm" | "daily_calm";
};
