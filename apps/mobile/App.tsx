import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import {
  GoogleAuthSessionProvider,
  shouldSkipSplashForOAuth,
} from "./src/auth/GoogleAuthSession";
import { needsOnboarding } from "./src/lib/onboarding";
import { getWelcomeSeen } from "./src/lib/welcome";
import { RootTabs } from "./src/navigation/RootTabs";
import { GetStartedScreen } from "./src/screens/GetStartedScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { colors } from "./src/theme/colors";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-gesture-handler";

function AppGate() {
  const { loading, isAuthenticated, user, needsOnboarding: mustOnboard } = useAuth();
  const skipIntro = Platform.OS === "web" && shouldSkipSplashForOAuth();
  const [splashDone, setSplashDone] = useState(skipIntro);
  const [welcomeReady, setWelcomeReady] = useState(skipIntro);
  const [welcomeSeen, setWelcomeSeenState] = useState(skipIntro);
  const onSplashFinish = useCallback(() => setSplashDone(true), []);
  const onWelcomeFinish = useCallback(() => setWelcomeSeenState(true), []);

  useEffect(() => {
    if (skipIntro) return;
    let alive = true;
    void getWelcomeSeen().then((seen) => {
      if (!alive) return;
      setWelcomeSeenState(seen);
      setWelcomeReady(true);
    });
    return () => {
      alive = false;
    };
  }, [skipIntro]);

  if (!splashDone) {
    return <SplashScreen onFinish={onSplashFinish} />;
  }

  if (!welcomeReady || loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.fg} size="large" />
      </View>
    );
  }

  if (!welcomeSeen && !isAuthenticated) {
    return <GetStartedScreen onFinish={onWelcomeFinish} />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (mustOnboard || needsOnboarding(user)) {
    return <OnboardingScreen />;
  }

  return <RootTabs />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <GoogleAuthSessionProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppGate />
          </NavigationContainer>
        </GoogleAuthSessionProvider>
      </AuthProvider>
    </SafeAreaProvider>
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
