import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  signInWithGoogle: (idToken: string) => Promise<void>;
  signInWithPhoneCode: (phone: string, code: string) => Promise<void>;
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
    onboarding_completed: user.onboarding_completed,
  };
}

function isUnauthorizedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /\b401\b|token|credentials|authenticated|авториз/i.test(msg);
}

async function persistAuth(data: AuthSuccess) {
  await saveSession({
    access: data.access,
    refresh: data.refresh,
    session_id: data.session_id,
    user: apiUserToStored(data.user),
  });
  if (data.user.phone) {
    const digits = data.user.phone.replace(/\D/g, "").slice(-9);
    if (digits) await setLastPhone(digits);
  }
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

  const refreshMe = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      await persistUserCache(me);
    } catch (err) {
      // Tarmoq xatosida sessiyani o'chirmaymiz — faqat 401.
      if (isUnauthorizedError(err)) {
        await clearSession();
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        const cached = await getStoredUser();

        if (!token) {
          if (!cancelled) setUser(null);
          return;
        }

        // Avval cache — splash/login flash bo'lmasin
        if (cached && !cancelled) {
          setUser(storedToApiUser(cached));
        }

        try {
          const me = await fetchMe();
          if (!cancelled) {
            setUser(me);
            await persistUserCache(me);
          }
        } catch (err) {
          if (isUnauthorizedError(err)) {
            await clearSession();
            if (!cancelled) setUser(null);
          }
          // Boshqa xato: token + cache bilan davom etamiz
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    const data = await apiGoogle(idToken);
    await persistAuth(data);
    setUser(data.user);
  }, []);

  const signInWithPhoneCode = useCallback(async (phone: string, code: string) => {
    const data = await verifyPhoneCode(phone, code, "login");
    await persistAuth(data);
    setUser(data.user);
  }, []);

  const signInWithPassword = useCallback(async (phone: string, password: string) => {
    const data = await apiPassword(phone, password);
    await persistAuth(data);
    setUser(data.user);
  }, []);

  const requestPhoneCode = useCallback(async (phone: string) => {
    await setLastPhone(phone);
    const res = await sendPhoneCode(phone, "login");
    return { debug_code: res.debug_code, detail: res.detail };
  }, []);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
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
