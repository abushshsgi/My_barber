import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loginWithGoogle as apiGoogle,
  loginWithPassword as apiPassword,
  sendPhoneCode,
  verifyPhoneCode,
  type AuthSuccess,
} from "../api/auth";
import { fetchMe, type ApiUser } from "../api/user";
import { needsOnboarding } from "../lib/onboarding";
import { prefetchCareCatalog } from "../lib/care-catalog-cache";
import { prefetchCareWeather } from "../hooks/useCareWeather";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  saveSession,
  setLastPhone,
  type StoredUser,
} from "./storage";

type AuthContextValue = {
  user: ApiUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  signInWithGoogle: (idToken: string, referralCode?: string) => Promise<void>;
  signInWithPhoneCode: (phone: string, code: string, referralCode?: string) => Promise<void>;
  signInWithPassword: (phone: string, password: string) => Promise<void>;
  requestPhoneCode: (phone: string) => Promise<{ debug_code?: string; detail: string }>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function storedToApiUser(stored: StoredUser): ApiUser {
  return {
    id: stored.id,
    email: stored.email || "",
    phone: stored.phone,
    full_name: stored.name,
    first_name: stored.first_name || stored.name,
    last_name: stored.last_name,
    birth_year: stored.birth_year,
    latitude: stored.latitude,
    longitude: stored.longitude,
    onboarding_completed: stored.onboarding_completed,
  };
}

function apiUserToStored(user: ApiUser): StoredUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.full_name || [user.first_name, user.last_name].filter(Boolean).join(" "),
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    birth_year: user.birth_year ?? null,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    onboarding_completed: user.onboarding_completed,
  };
}

function normalizeAuthUser(user: ApiUser, isNewUser?: boolean): ApiUser {
  if (isNewUser) {
    return { ...user, onboarding_completed: false };
  }
  return user;
}

function isUnauthorizedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /\b401\b|token|credentials|authenticated|авториз/i.test(msg);
}

async function persistAuth(data: AuthSuccess) {
  const user = normalizeAuthUser(data.user, data.is_new_user);
  await saveSession({
    access: data.access,
    refresh: data.refresh,
    session_id: data.session_id,
    user: apiUserToStored(user),
  });
  if (user.phone) {
    const digits = user.phone.replace(/\D/g, "").slice(-9);
    if (digits) await setLastPhone(digits);
  }
  return user;
}

async function persistUserCache(user: ApiUser) {
  const access = await getAccessToken();
  const refresh = await getRefreshToken();
  if (!access || !refresh) return;
  await saveSession({
    access,
    refresh,
    user: apiUserToStored(user),
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const signedInRef = useRef(false);
  const bootGenRef = useRef(0);

  const refreshMe = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      if (!signedInRef.current) setUser(null);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      await persistUserCache(me);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        signedInRef.current = false;
        await clearSession();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const gen = ++bootGenRef.current;
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const cached = await getStoredUser();

        if (!token) {
          // OAuth redirect: Google login boot bilan parallel — yangi sessiyani o'chirmaymiz.
          if (!cancelled && !signedInRef.current && gen === bootGenRef.current) {
            setUser(null);
          }
          return;
        }

        if (cached && !cancelled && !signedInRef.current) {
          setUser(storedToApiUser(cached));
          void prefetchCareWeather({
            savedLat: cached.latitude != null ? Number(cached.latitude) : null,
            savedLon: cached.longitude != null ? Number(cached.longitude) : null,
          });
          void prefetchCareCatalog({ recommended: true });
        }

        try {
          const me = await fetchMe();
          if (!cancelled && gen === bootGenRef.current && !signedInRef.current) {
            setUser(me);
            await persistUserCache(me);
            void prefetchCareWeather({
              savedLat: me.latitude != null ? Number(me.latitude) : null,
              savedLon: me.longitude != null ? Number(me.longitude) : null,
            });
            void prefetchCareCatalog({ recommended: true });
          } else if (!cancelled && signedInRef.current) {
            // Login allaqachon bo'lgan — faqat cache yangilash
            await persistUserCache(me);
          }
        } catch (err) {
          if (isUnauthorizedError(err) && !signedInRef.current) {
            await clearSession();
            if (!cancelled) setUser(null);
          }
        }
      } catch {
        if (!cancelled && !signedInRef.current) setUser(null);
      } finally {
        if (!cancelled && gen === bootGenRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyAuthSuccess = useCallback(async (data: AuthSuccess) => {
    signedInRef.current = true;
    bootGenRef.current += 1;
    const user = await persistAuth(data);
    setUser(user);
    setLoading(false);
    // Parvarish home: geo + ob-havo + katalog oldindan — demo kutish bo‘lmasin
    void prefetchCareWeather({
      savedLat: user.latitude != null ? Number(user.latitude) : null,
      savedLon: user.longitude != null ? Number(user.longitude) : null,
    });
    void prefetchCareCatalog({ recommended: true });
    try {
      const me = await fetchMe();
      const merged = data.is_new_user ? { ...me, onboarding_completed: false } : me;
      setUser(merged);
      await persistUserCache(merged);
      void prefetchCareWeather({
        savedLat: merged.latitude != null ? Number(merged.latitude) : null,
        savedLon: merged.longitude != null ? Number(merged.longitude) : null,
      });
      void prefetchCareCatalog({ recommended: true });
    } catch {
      /* login user bilan davom */
    }
  }, []);

  const signInWithGoogle = useCallback(
    async (idToken: string, referralCode?: string) => {
      const data = await apiGoogle(idToken, referralCode);
      await applyAuthSuccess(data);
      const { trackAuthSuccess } = await import("../lib/analytics");
      trackAuthSuccess({ isNewUser: Boolean(data.is_new_user), method: "google" });
    },
    [applyAuthSuccess],
  );

  const signInWithPhoneCode = useCallback(
    async (phone: string, code: string, referralCode?: string) => {
      const data = await verifyPhoneCode(phone, code, "login", referralCode);
      await applyAuthSuccess(data);
      const { trackAuthSuccess } = await import("../lib/analytics");
      trackAuthSuccess({ isNewUser: Boolean(data.is_new_user), method: "phone" });
    },
    [applyAuthSuccess],
  );

  const signInWithPassword = useCallback(
    async (phone: string, password: string) => {
      const data = await apiPassword(phone, password);
      await applyAuthSuccess(data);
      const { trackAuthSuccess } = await import("../lib/analytics");
      trackAuthSuccess({ isNewUser: Boolean(data.is_new_user), method: "password" });
    },
    [applyAuthSuccess],
  );

  const requestPhoneCode = useCallback(async (phone: string) => {
    await setLastPhone(phone);
    const res = await sendPhoneCode(phone, "login");
    return { debug_code: res.debug_code, detail: res.detail };
  }, []);

  const signOut = useCallback(async () => {
    signedInRef.current = false;
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      needsOnboarding: needsOnboarding(user),
      signInWithGoogle,
      signInWithPhoneCode,
      signInWithPassword,
      requestPhoneCode,
      signOut,
      refreshMe,
    }),
    [
      user,
      loading,
      signInWithGoogle,
      signInWithPhoneCode,
      signInWithPassword,
      requestPhoneCode,
      signOut,
      refreshMe,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth AuthProvider ichida ishlatilsin");
  return ctx;
}
