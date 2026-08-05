import { useCallback, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import {
  GoogleAuthSessionProvider,
  shouldSkipSplashForOAuth,
} from "./src/auth/GoogleAuthSession";
import { needsOnboarding } from "./src/lib/onboarding";
import { RootTabs } from "./src/navigation/RootTabs";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { colors } from "./src/theme/colors";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-gesture-handler";

function AppGate() {
  const { loading, isAuthenticated, user } = useAuth();
  const [splashDone, setSplashDone] = useState(
    () => Platform.OS === "web" && shouldSkipSplashForOAuth(),
  );
  const onSplashFinish = useCallback(() => setSplashDone(true), []);

  if (!splashDone) {
    return <SplashScreen onFinish={onSplashFinish} />;
  }

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.fg} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (needsOnboarding(user)) {
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
