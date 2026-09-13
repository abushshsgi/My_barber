import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
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
import { getGoogleWebClientId } from "../api/auth";
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
  if (typeof window === "undefined") return false;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    hash.includes("id_token") ||
    hash.includes("access_token") ||
    search.includes("code=") ||
    search.includes("id_token")
  );
}

/** OAuth redirect qaytganda Splash o'tkazib yuborilsin (faqat web). */
export function shouldSkipSplashForOAuth(): boolean {
  return oauthCallbackPending();
}

function readWebOAuthIdToken(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash?.replace(/^#/, "") || "";
  const search = window.location.search?.replace(/^\?/, "") || "";
  const fromHash = new URLSearchParams(hash).get("id_token");
  const fromSearch = new URLSearchParams(search).get("id_token");
  return fromHash || fromSearch;
}

function clearWebOAuthParamsFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.hash = "";
    [
      "id_token",
      "access_token",
      "state",
      "token_type",
      "expires_in",
      "code",
      "scope",
      "authuser",
      "prompt",
      "hd",
    ].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  } catch {
    /* ignore */
  }
}

async function completeBackendSignIn(
  auth: ReturnType<typeof useAuth>,
  idToken: string,
): Promise<void> {
  const { consumePendingReferralCode } = await import("../lib/referral-storage");
  const referral = await consumePendingReferralCode();
  await auth.signInWithGoogle(idToken, referral);
}

/** Web: to'liq sahifa Google OAuth redirect. */
export function GoogleAuthSessionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const googleClientId = getGoogleWebClientId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated) setBusy(false);
  }, [auth.isAuthenticated]);

  const redirectUri = useMemo(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return AuthSession.makeRedirectUri({
      scheme: "mysaloon",
      preferLocalhost: true,
    });
  }, []);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleClientId
      ? {
          clientId: googleClientId,
          webClientId: googleClientId,
          redirectUri,
        }
      : { clientId: "unused.apps.googleusercontent.com", redirectUri },
  );

  useEffect(() => {
    const idToken = readWebOAuthIdToken();
    if (!idToken) return;

    const key = idToken.slice(0, 24);
    if (handledRef.current === key) return;
    handledRef.current = key;
    clearWebOAuthParamsFromUrl();
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await completeBackendSignIn(auth, idToken);
      } catch (err) {
        handledRef.current = null;
        setError(err instanceof Error ? err.message : "Google kirish xato");
      } finally {
        setBusy(false);
      }
    })();
  }, [auth]);

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
    if (handledRef.current === key) {
      setBusy(false);
      return;
    }

    if (!idToken) {
      setBusy(false);
      setError("Google token olinmadi. Qayta urinib ko'ring.");
      return;
    }

    handledRef.current = key;
    setBusy(true);
    setError(null);
    void (async () => {
      try {
        await completeBackendSignIn(auth, idToken);
      } catch (err) {
        handledRef.current = null;
        setError(err instanceof Error ? err.message : "Google kirish xato");
      } finally {
        setBusy(false);
      }
    })();
  }, [response, auth]);

  const promptGoogle = useCallback(async () => {
    setError(null);
    if (!googleClientId) {
      setError("Google Client ID sozlanmagan.");
      return;
    }
    if (!request?.url) {
      setError("Google so'rov tayyor emas. Bir soniya kutib qayta bosing.");
      return;
    }

    setBusy(true);
    try {
      window.location.assign(request.url);
    } catch (err) {
      try {
        const result = await promptAsync();
        setBusy(false);
        if (result.type === "error") {
          setError(result.error?.message || "Google kirish xato");
        }
      } catch (popupErr) {
        setBusy(false);
        const msg =
          popupErr instanceof Error
            ? popupErr.message
            : err instanceof Error
              ? err.message
              : "Google ochilmadi";
        setError(
          /Popup window was blocked|ERR_WEB_BROWSER_BLOCKED/i.test(msg)
            ? "Brauzer Google oynasini blokladi. Sahifani yangilab qayta urinib ko'ring."
            : msg,
        );
      }
    }
  }, [googleClientId, request, promptAsync]);

  const value = useMemo(
    () => ({
      ready: Boolean(googleClientId && request?.url),
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
