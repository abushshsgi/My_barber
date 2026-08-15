import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { useAppShell } from "../lib/AppShellContext";
import { LoginScreen } from "../screens/LoginScreen";
import { MorphPaywallScreen } from "../screens/morph/MorphPaywallScreen";
import { NotificationPrefsScreen } from "../screens/profile/NotificationPrefsScreen";
import { NotificationsScreen } from "../screens/profile/NotificationsScreen";
import { OrdersScreen } from "../screens/profile/OrdersScreen";
import { PersonalInfoScreen } from "../screens/profile/PersonalInfoScreen";
import { ProfileHomeScreen } from "../screens/profile/ProfileHomeScreen";
import { SecurityScreen } from "../screens/profile/SecurityScreen";
import { SettingsScreen } from "../screens/profile/SettingsScreen";
import { SubscriptionsScreen } from "../screens/profile/SubscriptionsScreen";
import { ReferralScreen } from "../screens/profile/ReferralScreen";
import { WalletGiftScreen } from "../screens/wallet/WalletGiftScreen";
import { WalletGiftsScreen } from "../screens/wallet/WalletGiftsScreen";
import { WalletGateScreen } from "../screens/wallet/WalletGateScreen";
import { WalletHomeScreen } from "../screens/wallet/WalletHomeScreen";
import { WalletQrPayScreen } from "../screens/wallet/WalletQrPayScreen";
import { WalletTopUpScreen } from "../screens/wallet/WalletTopUpScreen";
import { WalletTransactionsScreen } from "../screens/wallet/WalletTransactionsScreen";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Orders: undefined;
  Settings: undefined;
  PersonalInfo: undefined;
  Security: undefined;
  NotificationPrefs: undefined;
  Notifications: undefined;
  Subscriptions: undefined;
  MorphPaywall: { reason?: import("../lib/morph-return").PaywallReason; returnTo?: import("../lib/morph-return").MorphReturnTo } | undefined;
  Referrals: undefined;
  WalletGate: undefined;
  WalletHome: undefined;
  WalletTopUp: undefined;
  WalletGift: undefined;
  WalletGifts: undefined;
  WalletQrPay: undefined;
  WalletTransactions: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/** Profil oqimi — mehmon uchun login; autentifikatsiyadan keyin stack. */
export function ProfileStack() {
  const { isAuthenticated } = useAuth();
  const { shell } = useAppShell();
  const morphHome = shell === "morph";

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: {
          backgroundColor:
            morphHome && route.name === "ProfileHome" ? "#070708" : "#FFFFFF",
        },
      })}
    >
      <Stack.Screen name="ProfileHome" component={ProfileHomeScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="Referrals" component={ReferralScreen} />
      <Stack.Screen
        name="MorphPaywall"
        component={MorphPaywallScreen}
        options={{ contentStyle: { backgroundColor: "#FFFFFF" } }}
      />
      <Stack.Screen name="WalletGate" component={WalletGateScreen} />
      <Stack.Screen name="WalletHome" component={WalletHomeScreen} />
      <Stack.Screen name="WalletTopUp" component={WalletTopUpScreen} />
      <Stack.Screen name="WalletGift" component={WalletGiftScreen} />
      <Stack.Screen name="WalletGifts" component={WalletGiftsScreen} />
      <Stack.Screen name="WalletQrPay" component={WalletQrPayScreen} />
      <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} />
    </Stack.Navigator>
  );
}
