import {
  clearUserTokens,
  getUserAccessToken,
  hasValidUserSession,
  setUserTokens,
  type ApiUser,
} from "@/lib/api";
import { prepareFaceProfileStorageForUser } from "@/lib/face-profile";
import { clearQueryClientCache, getQueryClient } from "@/lib/query-client";
import { notifyAudienceReset, prepareUserPrefsStorageForUser } from "@/lib/user-prefs";

const USER_KEY = "mysaloon.auth.user";
const LAST_PHONE_KEY = "mysaloon.auth.lastPhone";

export function getLastPhone(): string {
  try {
    return localStorage.getItem(LAST_PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberPhone(phone: string) {
  try {
    const digits = phone.replace(/\D/g, "").slice(-9);
    if (digits.length === 9) localStorage.setItem(LAST_PHONE_KEY, digits);
  } catch {
    /* noop */
  }
}

export type AuthUser = {
  phone: string;
  name?: string;
  id?: number;
};

function userFromApi(user: ApiUser): AuthUser {
  return {
    id: user.id,
    phone: user.phone ?? "",
    name: user.full_name || undefined,
  };
}

export function getToken(): string | null {
  return getUserAccessToken();
}

export function setSession(access: string, refresh: string, user: ApiUser) {
  setUserTokens(access, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(userFromApi(user)));
  if (user.phone) rememberPhone(user.phone);

  if (typeof user.id === "number") {
    prepareFaceProfileStorageForUser(user.id);
    prepareUserPrefsStorageForUser(user.id);
    notifyAudienceReset(user.id);
  }

  clearQueryClientCache();
  void getQueryClient()?.invalidateQueries();
}

export function getAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return hasValidUserSession();
}

export function logout() {
  clearUserTokens();
  clearQueryClientCache();
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
  notifyAudienceReset(null);
  /* LAST_PHONE_KEY saqlanadi — keyingi kirishda raqam tayyor bo'ladi */
}
