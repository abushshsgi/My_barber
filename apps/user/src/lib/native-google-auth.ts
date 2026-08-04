import { Capacitor } from "@capacitor/core";

const WEB_CLIENT_ID = (
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_GOOGLE_CLIENT_ID || ""
).trim();

let initialized = false;

export function getGoogleWebClientId(): string {
  return WEB_CLIENT_ID;
}

export async function nativeGoogleIdToken(): Promise<string> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("Native Google Sign-In faqat ilovada.");
  }
  if (!WEB_CLIENT_ID) {
    throw new Error("VITE_GOOGLE_CLIENT_ID sozlanmagan.");
  }

  const { SocialLogin } = await import("@capgo/capacitor-social-login");

  if (!initialized) {
    await SocialLogin.initialize({
      google: {
        webClientId: WEB_CLIENT_ID,
        mode: "online",
      },
    });
    initialized = true;
  }

  const login = await SocialLogin.login({
    provider: "google",
    options: {
      scopes: ["email", "profile"],
      style: "bottom",
      filterByAuthorizedAccounts: false,
    },
  });

  if (login.provider !== "google") {
    throw new Error("Google kirish bekor qilindi.");
  }

  const result = login.result;
  if (result.responseType === "offline") {
    throw new Error("Google offline mode — ID token olinmadi.");
  }

  const idToken = result.idToken?.trim();
  if (!idToken) {
    throw new Error("Google ID token olinmadi.");
  }
  return idToken;
}
