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
  getScanPromoSeen,
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
import { needsOnboarding } from "./src/lib/onboarding";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { FeatureOnboardingCarousel } from "./src/screens/onboarding/FeatureOnboardingCarousel";
import { OnboardingLoginScreen } from "./src/screens/onboarding/OnboardingLoginScreen";
import { GenderSelectScreen } from "./src/screens/onboarding/GenderSelectScreen";
import { TermsAcceptScreen } from "./src/screens/onboarding/TermsAcceptScreen";
import { ScanPromoScreen } from "./src/screens/onboarding/ScanPromoScreen";
import { NotificationPromoScreen } from "./src/screens/onboarding/NotificationPromoScreen";
import { AccountCreatingScreen } from "./src/screens/AccountCreatingScreen";
import { ToastProvider } from "./src/components/ui/ToastProvider";
import { colors } from "./src/theme/colors";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { updateMe } from "./src/api/user";

void ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

function userHasCoords(user: {
  latitude?: string | number | null;
  longitude?: string | number | null;
} | null): boolean {
  if (!user) return false;
  const lat = user.latitude;
  const lng = user.longitude;
  return (
    lat != null &&
    lat !== "" &&
    lng != null &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  );
}

/**
 * Splash+til → Feature (chat/try-on/care) → Login (majburiy)
 * → Gender → Terms → Location → Profil → Creating → App
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
  const [scanSeen, setScanSeen] = useState(skipIntro);
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
      getScanPromoSeen(),
      getNotifPromoSeen(),
      getGuestLocation(),
      getAccountReadySeen(),
    ]).then(
      async ([appLang, features, welcome, g, terms, scan, notif, loc, ready]) => {
        if (!alive) return;
        const resolved = appLang ?? "ru";
        await initI18n(resolved);
        setLang(appLang);
        setFeaturesSeenState(features || welcome);
        setGenderState(g);
        setTermsOk(terms);
        setScanSeen(scan);
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

  const hasLocation = !!guestLocation || userHasCoords(user);
  if (!hasLocation) {
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

  if (!scanSeen) {
    return <ScanPromoScreen onFinish={() => setScanSeen(true)} />;
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
    void (async () => {
      try {
        await NavigationBar.setPositionAsync("absolute");
        await NavigationBar.setBackgroundColorAsync("#00000000");
      } catch (err) {
        console.warn("NavigationBar boot", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    void ExpoSplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <AuthProvider>
              <GoogleAuthSessionProvider>
                <ToastProvider>
                  <NavigationContainer>
                    <StatusBar style="dark" />
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
