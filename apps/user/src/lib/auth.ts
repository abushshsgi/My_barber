import {
  clearUserTokens,
  getUserAccessToken,
  loginUser,
  registerUser,
  setUserTokens,
  type ApiUser,
} from "@/lib/user-api";

const USER_KEY = "mysaloon.auth.user";
const LEGACY_TOKEN_KEY = "mysaloon.auth.token";

export type AuthUser = {
  id?: number;
  email: string;
  phone?: string | null;
  name?: string;
  region?: string | null;
  avatar?: string | null;
};

function toAuthUser(user: ApiUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone || "",
    name: user.full_name || user.email,
    region: user.region || "",
    avatar: user.avatar || "",
  };
}

export function getToken(): string | null {
  try {
    return getUserAccessToken();
  } catch {
    return null;
  }
}

export function setSession(access: string, refresh: string, user: ApiUser | AuthUser) {
  setUserTokens(access, refresh);
  const normalized = "full_name" in user ? toAuthUser(user) : user;
  localStorage.setItem(USER_KEY, JSON.stringify(normalized));
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
  try {
    clearUserTokens();
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthUser> {
  const response = await loginUser(email, password);
  const user = toAuthUser(response.user);
  setSession(response.access, response.refresh, user);
  return user;
}

export async function signUpAndSignIn(input: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  region?: string;
}): Promise<AuthUser> {
  await registerUser(input);
  return signInWithPassword(input.email, input.password);
}
