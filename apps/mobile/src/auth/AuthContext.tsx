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

async function persistAuth(data: AuthSuccess) {
  const stored: StoredUser = {
    id: data.user.id,
    phone: data.user.phone,
    name: data.user.full_name || data.user.first_name,
    email: data.user.email,
  };
  await saveSession({
    access: data.access,
    refresh: data.refresh,
    session_id: data.session_id,
    user: stored,
  });
  if (data.user.phone) {
    const digits = data.user.phone.replace(/\D/g, "").slice(-9);
    if (digits) await setLastPhone(digits);
  }
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
    } catch {
      await clearSession();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          const cached = await getStoredUser();
          if (!cancelled && cached) {
            // Token yo'q — cached user ishonchsiz
          }
          if (!cancelled) setUser(null);
          return;
        }
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        await clearSession();
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
