import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useFonts } from "expo-font";
import { I18nextProvider } from "react-i18next";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import {
  GoogleAuthSessionProvider,
  shouldSkipSplashForOAuth,
} from "./src/auth/GoogleAuthSession";
import { initI18n, setAppLanguage } from "./src/i18n/config";
import i18n from "./src/i18n/config";
import {
  getAppLang,
  getGuestLocation,
  getWelcomeSeen,
  type AppLang,
  type GuestLocation,
} from "./src/lib/guest";
import { needsOnboarding } from "./src/lib/onboarding";
import { RootNavigator } from "./src/navigation/RootNavigator";
import {
  GetStartedScreen,
  type LocationEntryMode,
} from "./src/screens/GetStartedScreen";
import { LocationPickerScreen } from "./src/screens/LocationPickerScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { ToastProvider } from "./src/components/ui/ToastProvider";
import { MonopoCursor } from "./src/components/ui/MonopoCursor";
import { colors } from "./src/theme/colors";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-gesture-handler";

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
 * Birinchi ochilish:
 * Splash+til → Get Started → Location → Home (mehmon)
 * Profil → Login → ism/yosh → akkaunt
 */
function AppGate() {
  const { loading, isAuthenticated, user, needsOnboarding: mustOnboard } = useAuth();
  const skipIntro = Platform.OS === "web" && shouldSkipSplashForOAuth();

  const [splashDone, setSplashDone] = useState(skipIntro);
  const [bootReady, setBootReady] = useState(skipIntro);
  const [lang, setLang] = useState<AppLang | null>(skipIntro ? "ru" : null);
  const [welcomeSeen, setWelcomeSeenState] = useState(skipIntro);
  const [locationMode, setLocationMode] = useState<LocationEntryMode>("map");
  const [guestLocation, setGuestLocationState] = useState<GuestLocation | null>(null);

  const onSplashFinish = useCallback(() => setSplashDone(true), []);
  const onLanguagePick = useCallback((picked: AppLang) => {
    void setAppLanguage(picked);
    setLang(picked);
  }, []);

  const onWelcomeFinish = useCallback((mode: LocationEntryMode) => {
    setLocationMode(mode);
    setWelcomeSeenState(true);
  }, []);
  const onLocationFinish = useCallback(() => {
    void getGuestLocation().then((loc) => setGuestLocationState(loc));
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
    void Promise.all([getAppLang(), getWelcomeSeen(), getGuestLocation()]).then(
      async ([appLang, seen, loc]) => {
        if (!alive) return;
        const resolved = appLang ?? "ru";
        await initI18n(resolved);
        setLang(resolved);
        setWelcomeSeenState(seen);
        setGuestLocationState(loc);
        setBootReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [skipIntro]);

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

  if (!welcomeSeen) {
    return <GetStartedScreen onFinish={onWelcomeFinish} />;
  }

  const hasLocation = !!guestLocation || (isAuthenticated && userHasCoords(user));
  if (!hasLocation) {
    return (
      <LocationPickerScreen
        onFinish={onLocationFinish}
        initialMode={locationMode}
      />
    );
  }

  if (isAuthenticated && (mustOnboard || needsOnboarding(user))) {
    return <OnboardingScreen />;
  }

  return <RootNavigator />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Jost: require("./assets/fonts/Jost.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.fg} size="large" />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <GoogleAuthSessionProvider>
              <ToastProvider>
                <NavigationContainer>
                  <StatusBar style="dark" />
                  <AppGate />
                  <MonopoCursor />
                </NavigationContainer>
              </ToastProvider>
            </GoogleAuthSessionProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
