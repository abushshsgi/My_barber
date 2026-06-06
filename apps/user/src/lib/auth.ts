import {
  clearUserTokens,
  getUserAccessToken,
  setUserTokens,
  type ApiUser,
} from "@/lib/api";

const USER_KEY = "mysaloon.auth.user";

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
  return Boolean(getToken());
}

export function logout() {
  clearUserTokens();
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
}
