import "react-native-gesture-handler";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useFonts } from "expo-font";
import * as ExpoSplashScreen from "expo-splash-screen";
import { I18nextProvider } from "react-i18next";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import {
  GoogleAuthSessionProvider,
  shouldSkipSplashForOAuth,
} from "./src/auth/GoogleAuthSession";
import { initI18n, setAppLanguage } from "./src/i18n/config";
import i18n from "./src/i18n/config";
import {
  getAccountReadySeen,
  getAppGender,
  getAppLang,
  getFeaturesSeen,
  getGuestLocation,
  getNotifPromoSeen,
  getTermsAccepted,
  getWelcomeSeen,
  setAccountReadySeen,
  setAppGender,
  clearFeaturesSeen,
  setWelcomeSeen,
  type AppGender,
  type AppLang,
  type GuestLocation,
} from "./src/lib/guest";
import { writeAppShell } from "./src/lib/app-shell";
import { markMorphTryOnIntroDone } from "./src/lib/morph-onboarding";
import { needsOnboarding, isProfileLocationRequired, userHasProfileCoords } from "./src/lib/onboarding";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { FeatureOnboardingCarousel } from "./src/screens/onboarding/FeatureOnboardingCarousel";
import { OnboardingLoginScreen } from "./src/screens/onboarding/OnboardingLoginScreen";
import { GenderSelectScreen } from "./src/screens/onboarding/GenderSelectScreen";
import { TermsAcceptScreen } from "./src/screens/onboarding/TermsAcceptScreen";
import { NotificationPromoScreen } from "./src/screens/onboarding/NotificationPromoScreen";
import { AccountCreatingScreen } from "./src/screens/AccountCreatingScreen";
import { ToastProvider } from "./src/components/ui/ToastProvider";
import { WalletTopUpLive } from "./src/components/wallet/WalletTopUpLive";
import { colors } from "./src/theme/colors";
import { NavigationContainer } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { AppStatusBar } from "./src/components/ui/AppStatusBar";
import { updateMe } from "./src/api/user";

void ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function blurFocusInsideHidden() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === document.body) return;
  if (active.closest('[aria-hidden="true"]')) active.blur();
}

/**
 * Web: React Navigation `pointerEvents="box-none"` ni inline style qilib beradi.
 * `box-none` haqiqiy CSS emas, shuning uchun brauzer oldingi `pointer-events: none`
 * ni o'zgartirmaydi va butun faol ekran bosilmay qoladi.
 * Klass orqali konteyner o'tkazib yuboradi, bolalari esa bosiladi.
 */
function fitWebViewport() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const styleId = "app-viewport-fit";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = [
      "html,body,#root{height:100%;width:100%;max-width:100%;margin:0;overflow:hidden}",
      "#root{display:flex;flex-direction:column;min-width:0}",
      "img,video,canvas,svg{max-width:100%;height:auto}",
    ].join("");
    document.head.appendChild(style);
  }
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute(
      "content",
      "width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover",
    );
  }
}

function repairWebBoxNone() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const styleId = "rn-box-none-fix";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      ".rn-box-none{pointer-events:none !important}.rn-box-none>*{pointer-events:auto !important}";
    document.head.appendChild(style);
  }
  document.querySelectorAll("div").forEach((el) => {
    const key = Object.keys(el).find((k) => k.startsWith("__reactProps"));
    const pointerEvents = key
      ? (el as unknown as Record<string, { style?: { pointerEvents?: string } }>)[key]
          ?.style?.pointerEvents
      : undefined;
    el.classList.toggle("rn-box-none", pointerEvents === "box-none");
  });
}

// Android Firebase Analytics — app ochilishi
if (Platform.OS === "android") {
  void import("./src/lib/analytics").then((m) => m.logAppOpen()).catch(() => {});
}

/**
 * Splash+til → Feature (chat/try-on/care) → Login (majburiy)
 * → Gender → Terms → (Location: faqat REQUIRE_PROFILE_LOCATION) → Profil → Creating → Notif → App
 */
function AppGate() {
  const { loading, isAuthenticated, user, needsOnboarding: mustOnboard } = useAuth();
  const skipIntro = Platform.OS === "web" && shouldSkipSplashForOAuth();

  const [splashDone, setSplashDone] = useState(skipIntro);
  const [bootReady, setBootReady] = useState(skipIntro);
  const [lang, setLang] = useState<AppLang | null>(skipIntro ? "ru" : null);
  const [featuresSeen, setFeaturesSeenState] = useState(skipIntro);
  const [gender, setGenderState] = useState<AppGender | null>(skipIntro ? "male" : null);
  const [termsOk, setTermsOk] = useState(skipIntro);
  const [notifSeen, setNotifSeen] = useState(skipIntro);
  const [accountReadySeen, setAccountReadySeenState] = useState(skipIntro);
  const [guestLocation, setGuestLocationState] = useState<GuestLocation | null>(null);

  const onSplashFinish = useCallback(() => setSplashDone(true), []);
  const onLanguagePick = useCallback((picked: AppLang) => {
    void setAppLanguage(picked);
    setLang(picked);
  }, []);

  useEffect(() => {
    if (skipIntro) {
      void initI18n("ru").then(() => {
        void getGuestLocation().then((loc) => {
          setGuestLocationState(loc);
          setBootReady(true);
        });
      });
      return;
    }
    let alive = true;
    void Promise.all([
      getAppLang(),
      getFeaturesSeen(),
      getWelcomeSeen(),
      getAppGender(),
      getTermsAccepted(),
      getNotifPromoSeen(),
      getGuestLocation(),
      getAccountReadySeen(),
    ]).then(
      async ([appLang, features, welcome, g, terms, notif, loc, ready]) => {
        if (!alive) return;
        const resolved = appLang ?? "ru";
        await initI18n(resolved);
        setLang(appLang);
        setFeaturesSeenState(features || welcome);
        setGenderState(g);
        setTermsOk(terms);
        setNotifSeen(notif);
        setGuestLocationState(loc);
        setAccountReadySeenState(ready || welcome);
        setBootReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [skipIntro]);

  // Gender → backend sync after login
  useEffect(() => {
    if (!isAuthenticated) return;
    const fromUser =
      user?.gender === "male" || user?.gender === "female" ? user.gender : null;
    if (fromUser && !gender) {
      setGenderState(fromUser);
      void setAppGender(fromUser);
      return;
    }
    if (!gender) return;
    void updateMe({ gender }).catch(() => undefined);
  }, [gender, isAuthenticated, user?.gender]);

  if (!bootReady || loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.fg} size="large" />
      </View>
    );
  }

  if (!splashDone) {
    return (
      <SplashScreen
        showLanguage={!lang}
        onFinish={onSplashFinish}
        onLanguagePick={onLanguagePick}
      />
    );
  }

  if (!featuresSeen) {
    return (
      <FeatureOnboardingCarousel
        onFinish={() => {
          setFeaturesSeenState(true);
          void setWelcomeSeen();
          void writeAppShell("morph");
          void markMorphTryOnIntroDone();
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <OnboardingLoginScreen
        onBack={() => {
          void clearFeaturesSeen().then(() => setFeaturesSeenState(false));
        }}
      />
    );
  }

  if (!gender) {
    return (
      <GenderSelectScreen
        onFinish={(g) => {
          setGenderState(g);
        }}
      />
    );
  }

  if (!termsOk) {
    return <TermsAcceptScreen onFinish={() => setTermsOk(true)} />;
  }

  if (isProfileLocationRequired(user) && !userHasProfileCoords(user)) {
    const {
      LocationPickerScreen,
    } = require("./src/screens/LocationPickerScreen") as typeof import("./src/screens/LocationPickerScreen");
    return (
      <LocationPickerScreen
        onFinish={() => {
          void getGuestLocation().then((loc) => setGuestLocationState(loc));
        }}
        initialMode="map"
      />
    );
  }

  if (mustOnboard || needsOnboarding(user)) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setAccountReadySeenState(false);
        }}
      />
    );
  }

  if (!accountReadySeen) {
    return (
      <AccountCreatingScreen
        onDone={() => {
          setAccountReadySeenState(true);
          void setAccountReadySeen();
          void writeAppShell("morph");
        }}
      />
    );
  }

  if (!notifSeen) {
    return <NotificationPromoScreen onFinish={() => setNotifSeen(true)} />;
  }

  return <RootNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Jost: require("./assets/fonts/Jost.ttf"),
  });

  useEffect(() => {
    if (Platform.OS !== "android") return;
    try {
      // Position/transparency — expo-navigation-bar plugin (app.config).
      // SDK 57+: setPositionAsync / setBackgroundColorAsync olib tashlangan.
      NavigationBar.setStyle("dark");
    } catch (err) {
      console.warn("NavigationBar boot", err);
    }
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    void ExpoSplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    fitWebViewport();
    const id = requestAnimationFrame(() => repairWebBoxNone());
    return () => cancelAnimationFrame(id);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <GestureHandlerRootView style={{ flex: 1, width: "100%", maxWidth: "100%", minWidth: 0, minHeight: 0 }}>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <AuthProvider>
              <GoogleAuthSessionProvider>
                <ToastProvider>
                  <WalletTopUpLive />
                  <NavigationContainer
                    onStateChange={() => {
                      requestAnimationFrame(() => {
                        blurFocusInsideHidden();
                        repairWebBoxNone();
                        requestAnimationFrame(repairWebBoxNone);
                      });
                    }}
                  >
                    <AppStatusBar style="dark" />
                    <AppGate />
                  </NavigationContainer>
                </ToastProvider>
              </GoogleAuthSessionProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </I18nextProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});
