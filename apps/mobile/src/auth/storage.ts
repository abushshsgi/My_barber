import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY = "mybarber_user_access";
const REFRESH_KEY = "mybarber_user_refresh";
const SESSION_KEY = "mybarber_user_session_id";
const USER_KEY = "mysaloon.auth.user";
const LAST_PHONE_KEY = "mysaloon.auth.lastPhone";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export type StoredUser = {
  id: number;
  phone?: string | null;
  name?: string;
  email?: string;
};

export async function saveSession(payload: {
  access: string;
  refresh: string;
  session_id?: number | string | null;
  user?: StoredUser | null;
}) {
  await setItem(ACCESS_KEY, payload.access);
  await setItem(REFRESH_KEY, payload.refresh);
  if (payload.session_id != null) {
    await setItem(SESSION_KEY, String(payload.session_id));
  }
  if (payload.user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }
}

export async function clearSession() {
  await Promise.all([
    deleteItem(ACCESS_KEY),
    deleteItem(REFRESH_KEY),
    deleteItem(SESSION_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}

export async function getAccessToken() {
  return getItem(ACCESS_KEY);
}

export async function getRefreshToken() {
  return getItem(REFRESH_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function setLastPhone(phone: string) {
  await AsyncStorage.setItem(LAST_PHONE_KEY, phone);
}

export async function getLastPhone() {
  return (await AsyncStorage.getItem(LAST_PHONE_KEY)) || "";
}
