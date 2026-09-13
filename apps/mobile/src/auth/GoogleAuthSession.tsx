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

type GoogleAuthContextValue = {
  ready: boolean;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  promptGoogle: () => Promise<void>;
};

const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

/** Web OAuth redirect — native da kerak emas. */
export function shouldSkipSplashForOAuth(): boolean {
  return false;
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
 * Faqat native Google Sign-In (Play Services / iOS account sheet).
 * Brauzer, WebView, AuthSession — yo'q.
 */
export function GoogleAuthSessionProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const googleClientId = getGoogleWebClientId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nativeReady, setNativeReady] = useState(false);
  const configuredRef = useRef(false);

  useEffect(() => {
    if (!googleClientId || configuredRef.current) return;
    let cancelled = false;
    void (async () => {
      try {
        const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
        GoogleSignin.configure({
          webClientId: googleClientId,
          offlineAccess: false,
          forceCodeForRefreshToken: false,
        });
        configuredRef.current = true;
        if (!cancelled) setNativeReady(true);
      } catch (err) {
        if (__DEV__) console.warn("[google-auth] native configure failed", err);
        if (!cancelled) {
          setNativeReady(false);
          setError(
            "Native Google Sign-In yuklanmadi. Yangi development/APK build kerak (Expo Go ishlamaydi).",
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

  const promptGoogle = useCallback(async () => {
    setError(null);
    if (!googleClientId) {
      setError("Google Client ID sozlanmagan (Web OAuth client — EXPO_PUBLIC_GOOGLE_CLIENT_ID).");
      return;
    }
    if (!nativeReady) {
      setError(
        "Native Google Sign-In tayyor emas. Ilovani qayta o‘rnating yoki yangi APK build qiling.",
      );
      return;
    }

    setBusy(true);
    try {
      const {
        GoogleSignin,
        isSuccessResponse,
        isErrorWithCode,
        statusCodes,
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
      try {
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
            /DEVELOPER_ERROR|10:|ApiException:\s*10|Code:\s*10/i.test(msg)
              ? "Google sozlamasi xato: APK imzo SHA-1 Firebase/Cloud Console dagi Android OAuth client bilan mos emas. EAS release SHA-1 ni qo'shing, google-services.json ni yangilang va APK ni qayta build qiling."
              : msg,
          );
        }
      } catch {
        const msg = err instanceof Error ? err.message : "Google kirish xato";
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }, [auth, googleClientId, nativeReady]);

  const value = useMemo(
    () => ({
      ready: Boolean(googleClientId && nativeReady),
      busy,
      error,
      clearError: () => setError(null),
      promptGoogle,
    }),
    [googleClientId, nativeReady, busy, error, promptGoogle],
  );

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error("useGoogleAuth GoogleAuthSessionProvider ichida");
  return ctx;
}
