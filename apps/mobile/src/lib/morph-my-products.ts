import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchMyCareProducts,
  addMyCareProductApi,
  removeMyCareProductApi,
  type CareProduct,
} from "../api/care";

export type MyCareProduct = {
  id: number;
  name: string;
  brand: string;
  category: string;
  image_url: string | null;
  added_at: string;
  source: "scan" | "catalog" | "recommended";
  usage_uz?: string;
  purpose_uz?: string;
};

const MY_PRODUCTS_KEY = "mysaloon.morphAi.myProducts";
const ROUTINE_DONE_KEY = "mysaloon.morphAi.routineDone";
const WEATHER_INTRO_KEY = "mysaloon.morphAi.weatherIntroSeen";
const CARE_ONBOARDING_KEY = "mysaloon.morphAi.careOnboardingSeen";

async function saveLocal(rows: MyCareProduct[]) {
  await AsyncStorage.setItem(MY_PRODUCTS_KEY, JSON.stringify(rows));
}

export async function loadMyProductsLocal(): Promise<MyCareProduct[]> {
  try {
    const raw = await AsyncStorage.getItem(MY_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MyCareProduct[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Server + local cache. Auth bo‘lsa API ustuvor. */
export async function loadMyProducts(): Promise<MyCareProduct[]> {
  const local = await loadMyProductsLocal();
  try {
    const remote = await fetchMyCareProducts();
    if (Array.isArray(remote)) {
      const mapped: MyCareProduct[] = remote.map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand || "",
        category: r.category || "other",
        image_url: r.image_url,
        added_at: r.added_at || new Date().toISOString(),
        source: (r.source as MyCareProduct["source"]) || "catalog",
        usage_uz: r.usage_uz || "",
        purpose_uz: r.purpose_uz || "",
      }));
      await saveLocal(mapped);
      return mapped;
    }
  } catch {
    // offline / guest — local
  }
  return local;
}

export async function addMyProduct(
  product: Pick<MyCareProduct, "id" | "name" | "brand" | "category" | "image_url"> & {
    source?: MyCareProduct["source"];
  },
): Promise<MyCareProduct[]> {
  const source = product.source ?? "catalog";
  try {
    await addMyCareProductApi({ product_id: product.id, source });
  } catch {
    // local fallback
  }
  const rows = await loadMyProductsLocal();
  if (rows.some((r) => r.id === product.id)) {
    // refresh from server if possible
    return loadMyProducts();
  }
  const next: MyCareProduct = {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    image_url: product.image_url,
    added_at: new Date().toISOString(),
    source,
  };
  const merged = [next, ...rows];
  await saveLocal(merged);
  try {
    return await loadMyProducts();
  } catch {
    return merged;
  }
}

export async function removeMyProduct(id: number): Promise<MyCareProduct[]> {
  try {
    await removeMyCareProductApi(id);
  } catch {
    // offline / guest — faqat local
  }
  const rows = (await loadMyProductsLocal()).filter((r) => r.id !== id);
  await saveLocal(rows);
  // Serverdan qayta yuklash — o‘chirilganini tasdiqlash; xato bo‘lsa local qaytadi
  try {
    const remote = await fetchMyCareProducts();
    if (Array.isArray(remote)) {
      const mapped: MyCareProduct[] = remote.map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand || "",
        category: r.category || "other",
        image_url: r.image_url,
        added_at: r.added_at || new Date().toISOString(),
        source: (r.source as MyCareProduct["source"]) || "catalog",
        usage_uz: r.usage_uz || "",
        purpose_uz: r.purpose_uz || "",
      }));
      // Agar API o‘chirgan bo‘lsa remote da yo‘q; agar API fail bo‘lsa ham local filter ustuvor
      const synced = mapped.filter((r) => r.id !== id);
      await saveLocal(synced);
      return synced;
    }
  } catch {
    // keep local
  }
  return rows;
}

export async function isMyProduct(id: number): Promise<boolean> {
  const rows = await loadMyProducts();
  return rows.some((r) => r.id === id);
}

export function careProductToMy(
  product: CareProduct,
  source: MyCareProduct["source"] = "catalog",
): MyCareProduct {
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
  const map = await loadRoutineDone(date);
  if (done) map[taskId] = true;
  else delete map[taskId];
  await AsyncStorage.setItem(routineKey(date), JSON.stringify(map));
  return map;
}

export async function hasSeenWeatherIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WEATHER_INTRO_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markWeatherIntroSeen() {
  await AsyncStorage.setItem(WEATHER_INTRO_KEY, "1");
}

export async function hasSeenCareOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CARE_ONBOARDING_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function markCareOnboardingSeen() {
  await AsyncStorage.setItem(CARE_ONBOARDING_KEY, "1");
}
