import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { getGoogleClientId } from "../api/auth";
import { useAuth } from "./AuthContext";

WebBrowser.maybeCompleteAuthSession();

type GoogleAuthContextValue = {
  ready: boolean;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  promptGoogle: () => Promise<void>;
};

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

function oauthCallbackPending(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("id_token") ||
    hash.includes("access_token") ||
    search.includes("code=") ||
    search.includes("id_token")
  );
}

/** OAuth redirect qaytganda Splash o'tkazib yuborilsin. */
export function shouldSkipSplashForOAuth(): boolean {
  return oauthCallbackPending();
}

/**
 * Har doim mount — Splash paytida ham Google redirect javobini ushlaydi.
 * Aks holda localhost:8081 da account tanlab qaytganda login ekraniga qaytadi.
 */
export function GoogleAuthSessionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const googleClientId = getGoogleClientId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handled, setHandled] = useState<string | null>(null);

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "mysaloon",
        preferLocalhost: true,
      }),
    [],
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleClientId
      ? {
          clientId: googleClientId,
          iosClientId: googleClientId,
          androidClientId: googleClientId,
          webClientId: googleClientId,
          redirectUri,
        }
      : { clientId: "unused.apps.googleusercontent.com", redirectUri },
  );

  useEffect(() => {
    if (__DEV__) {
      console.log("[google-auth] redirectUri =", redirectUri, "response =", response?.type);
    }
  }, [redirectUri, response?.type]);

  // Chiqish / dismiss / cancel dan keyin spinner qolib ketmasin (web popup).
  useEffect(() => {
    if (!auth.isAuthenticated) {
      setBusy(false);
    }
  }, [auth.isAuthenticated]);

  useEffect(() => {
    if (!response) return;

    if (response.type !== "success") {
      setBusy(false);
      if (response.type === "error") {
        setError(response.error?.message || "Google kirish bekor qilindi yoki xato.");
      }
      return;
    }

    const idToken =
      response.params.id_token ||
      (response as { authentication?: { idToken?: string } }).authentication?.idToken;

    const key = idToken?.slice(0, 24) || "ok";
    if (handled === key) {
      setBusy(false);
      return;
    }

    if (!idToken) {
      setBusy(false);
      setError("Google token olinmadi. Qayta urinib ko'ring.");
      return;
    }

    setHandled(key);
    setBusy(true);
    setError(null);
    void auth
      .signInWithGoogle(idToken)
      .catch((err) => {
        setHandled(null);
        setError(err instanceof Error ? err.message : "Google kirish xato");
      })
      .finally(() => setBusy(false));
  }, [response, auth, handled]);

  const promptGoogle = useCallback(async () => {
    setError(null);
    if (!googleClientId) {
      setError(
        "Google Client ID sozlanmagan. EXPO_PUBLIC_GOOGLE_CLIENT_ID yoki app.json extra.googleClientId qo'shing.",
      );
      return;
    }
    if (!request) {
      setError("Google so'rov tayyor emas. Bir soniya kutib qayta bosing.");
      return;
    }
    setBusy(true);
    try {
      const result = await promptAsync();
      // success: API chaqiruvini useEffect boshqaradi (busy ni u yoqadi).
      // dismiss/cancel/error yoki allaqachon handled — spinner qolmasin.
      setBusy(false);
      if (result.type === "error") {
        setError(result.error?.message || "Google kirish xato");
      } else if (result.type === "dismiss" || result.type === "cancel") {
        setError(null);
      }
    } catch (err) {
      setBusy(false);
      const msg = err instanceof Error ? err.message : "Google ochilmadi";
      setError(
        /redirect|origin/i.test(msg)
          ? `${msg}\n\nGoogle Console → origins/redirect:\n${redirectUri}`
          : msg,
      );
    }
  }, [googleClientId, request, promptAsync, redirectUri]);

  const value = useMemo(
    () => ({
      ready: Boolean(googleClientId && request),
      busy,
      error,
      clearError: () => setError(null),
      promptGoogle,
    }),
    [googleClientId, request, busy, error, promptGoogle],
  );

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error("useGoogleAuth GoogleAuthSessionProvider ichida");
  return ctx;
}
