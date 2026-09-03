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
import { Platform } from "react-native";
import { getGoogleWebClientId } from "../api/auth";
import { useAuth } from "./AuthContext";

WebBrowser.maybeCompleteAuthSession();

const IS_NATIVE = Platform.OS === "ios" || Platform.OS === "android";

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

/** OAuth redirect qaytganda Splash o'tkazib yuborilsin (faqat web). */
export function shouldSkipSplashForOAuth(): boolean {
  return oauthCallbackPending();
}

async function completeBackendSignIn(
  auth: ReturnType<typeof useAuth>,
  idToken: string,
): Promise<void> {
  const { consumePendingReferralCode } = await import("../lib/referral-storage");
  const referral = await consumePendingReferralCode();
  await auth.signInWithGoogle(idToken, referral);
}

/**
 * Native (Android/iOS): tizim Google hisoblar oynasi — brauzer yo'q.
 * Web: expo-auth-session (redirect).
 */
export function GoogleAuthSessionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const googleClientId = getGoogleWebClientId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeReady, setNativeReady] = useState(!IS_NATIVE);
  const configuredRef = useRef(false);
  const handledRef = useRef<string | null>(null);

  // —— Native Google Sign-In configure ——
  useEffect(() => {
    if (!IS_NATIVE || !googleClientId || configuredRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
        GoogleSignin.configure({
          webClientId: googleClientId,
          offlineAccess: false,
        });
        configuredRef.current = true;
        if (!cancelled) setNativeReady(true);
      } catch (err) {
        if (__DEV__) console.warn("[google-auth] native configure failed", err);
        if (!cancelled) {
          setNativeReady(false);
          setError(
            "Native Google Sign-In yuklanmadi. Yangi development/APK build kerak.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [googleClientId]);

  useEffect(() => {
    if (!auth.isAuthenticated) setBusy(false);
  }, [auth.isAuthenticated]);

  const promptNativeGoogle = useCallback(async () => {
    setError(null);
    if (!googleClientId) {
      setError("Google Client ID sozlanmagan (Web OAuth client).");
      return;
    }
    setBusy(true);
    try {
      const {
        GoogleSignin,
        isSuccessResponse,
      } = await import("@react-native-google-signin/google-signin");

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        setBusy(false);
        return;
      }

      let idToken = response.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        setBusy(false);
        setError("Google token olinmadi. Qayta urinib ko'ring.");
        return;
      }
      await completeBackendSignIn(auth, idToken);
    } catch (err: unknown) {
      const { isErrorWithCode, statusCodes } = await import(
        "@react-native-google-signin/google-signin"
      );
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        setError(null);
      } else if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) {
        setError(null);
      } else if (
        isErrorWithCode(err) &&
        err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setError("Google Play Services mavjud emas yoki yangilanishi kerak.");
      } else {
        const msg = err instanceof Error ? err.message : "Google kirish xato";
        setError(
          /DEVELOPER_ERROR|10:|ApiException:\s*10/i.test(msg)
            ? "Google sozlamasi xato: Android SHA-1 fingerprint Cloud Console da mos emas. EAS/debug keystore SHA-1 ni qo'shing."
            : msg,
        );
      }
    } finally {
      setBusy(false);
    }
  }, [auth, googleClientId]);

  // —— Web: AuthSession (brauzer) ——
  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "mysaloon",
        preferLocalhost: true,
      }),
    [],
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    !IS_NATIVE && googleClientId
      ? {
          clientId: googleClientId,
          webClientId: googleClientId,
          redirectUri,
        }
      : { clientId: "unused.apps.googleusercontent.com", redirectUri },
  );

  useEffect(() => {
    if (IS_NATIVE || !response) return;

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

  const promptWebGoogle = useCallback(async () => {
    setError(null);
    if (!googleClientId) {
      setError("Google Client ID sozlanmagan.");
      return;
    }
    if (!request) {
      setError("Google so'rov tayyor emas. Bir soniya kutib qayta bosing.");
      return;
    }
    setBusy(true);
    try {
      const result = await promptAsync();
      setBusy(false);
      if (result.type === "error") {
        setError(result.error?.message || "Google kirish xato");
      }
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Google ochilmadi");
    }
  }, [googleClientId, request, promptAsync]);

  const promptGoogle = useCallback(async () => {
    if (IS_NATIVE) return promptNativeGoogle();
    return promptWebGoogle();
  }, [promptNativeGoogle, promptWebGoogle]);

  const value = useMemo(
    () => ({
      ready: IS_NATIVE
        ? Boolean(googleClientId && nativeReady)
        : Boolean(googleClientId && request),
      busy,
      error,
      clearError: () => setError(null),
      promptGoogle,
    }),
    [googleClientId, nativeReady, request, busy, error, promptGoogle],
  );

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error("useGoogleAuth GoogleAuthSessionProvider ichida");
  return ctx;
}
