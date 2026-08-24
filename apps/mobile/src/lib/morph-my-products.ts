import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CareProduct } from "../api/care";

export type MyCareProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
  added_at: string;
  source: "scan" | "catalog" | "recommended";
};

const MY_PRODUCTS_KEY = "mysaloon.morphAi.myProducts";
const ROUTINE_DONE_KEY = "mysaloon.morphAi.routineDone";
const WEATHER_INTRO_KEY = "mysaloon.morphAi.weatherIntroSeen";
const CARE_ONBOARDING_KEY = "mysaloon.morphAi.careOnboardingSeen";

export async function loadMyProducts(): Promise<MyCareProduct[]> {
  try {
    const raw = await AsyncStorage.getItem(MY_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MyCareProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addMyProduct(
  product: Pick<MyCareProduct, "id" | "name" | "brand" | "category" | "image_url"> & {
    source?: MyCareProduct["source"];
  },
): Promise<MyCareProduct[]> {
  const rows = await loadMyProducts();
  if (rows.some((r) => r.id === product.id)) return rows;
  const next: MyCareProduct = {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    image_url: product.image_url,
    added_at: new Date().toISOString(),
    source: product.source ?? "catalog",
  };
  const merged = [next, ...rows];
  await AsyncStorage.setItem(MY_PRODUCTS_KEY, JSON.stringify(merged));
  return merged;
}

export async function removeMyProduct(id: number): Promise<MyCareProduct[]> {
  const rows = (await loadMyProducts()).filter((r) => r.id !== id);
  await AsyncStorage.setItem(MY_PRODUCTS_KEY, JSON.stringify(rows));
  return rows;
}

export async function isMyProduct(id: number): Promise<boolean> {
  const rows = await loadMyProducts();
  return rows.some((r) => r.id === id);
}

export function careProductToMy(product: CareProduct, source: MyCareProduct["source"] = "catalog"): MyCareProduct {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    image_url: product.image_url,
    added_at: new Date().toISOString(),
    source,
  };
}

export type RoutineSlot = "morning" | "evening" | "weekly";

function routineKey(date: string): string {
  return `${ROUTINE_DONE_KEY}.${date}`;
}

export async function loadRoutineDone(date: string): Promise<Record<string, boolean>> {
  try {
    const raw = await AsyncStorage.getItem(routineKey(date));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function setRoutineTaskDone(
  date: string,
  taskId: string,
  done: boolean,
): Promise<Record<string, boolean>> {
  const prev = await loadRoutineDone(date);
  const next = { ...prev, [taskId]: done };
  await AsyncStorage.setItem(routineKey(date), JSON.stringify(next));
  return next;
}

export async function hasSeenWeatherIntro(): Promise<boolean> {
  return (await AsyncStorage.getItem(WEATHER_INTRO_KEY)) === "1";
}

export async function markWeatherIntroSeen(): Promise<void> {
  await AsyncStorage.setItem(WEATHER_INTRO_KEY, "1");
}

export async function hasSeenCareOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(CARE_ONBOARDING_KEY)) === "1";
}

export async function markCareOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(CARE_ONBOARDING_KEY, "1");
}
