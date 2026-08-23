import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { useAppShell } from "../lib/AppShellContext";
import { useMorphAppearance } from "../lib/MorphAppearanceContext";
import { LoginScreen } from "../screens/LoginScreen";
import { MorphPaywallScreen } from "../screens/morph/MorphPaywallScreen";
import { NotificationPrefsScreen } from "../screens/profile/NotificationPrefsScreen";
import { NotificationsScreen } from "../screens/profile/NotificationsScreen";
import { OrdersScreen } from "../screens/profile/OrdersScreen";
import { PersonalInfoScreen } from "../screens/profile/PersonalInfoScreen";
import { ProfileHomeScreen } from "../screens/profile/ProfileHomeScreen";
import { SecurityScreen } from "../screens/profile/SecurityScreen";
import { HelpCenterScreen } from "../screens/profile/HelpCenterScreen";
import { SettingsScreen } from "../screens/profile/SettingsScreen";
import { MorphAiSettingsScreen } from "../screens/morph/MorphAiSettingsScreen";
import { SecurityPasswordScreen } from "../screens/profile/SecurityPasswordScreen";
import { SecuritySessionsScreen } from "../screens/profile/SecuritySessionsScreen";
import { SubscriptionsScreen } from "../screens/profile/SubscriptionsScreen";
import { ReferralScreen } from "../screens/profile/ReferralScreen";
import { WalletFaqScreen } from "../screens/wallet/WalletFaqScreen";
import { WalletFreezeScreen } from "../screens/wallet/WalletFreezeScreen";
import { WalletGiftAmountScreen } from "../screens/wallet/WalletGiftAmountScreen";
import { WalletGiftScreen } from "../screens/wallet/WalletGiftScreen";
import { WalletGiftsScreen } from "../screens/wallet/WalletGiftsScreen";
import { WalletGateScreen } from "../screens/wallet/WalletGateScreen";
import { WalletHomeScreen } from "../screens/wallet/WalletHomeScreen";
import { WalletMoreScreen } from "../screens/wallet/WalletMoreScreen";
import { WalletQrPayScreen } from "../screens/wallet/WalletQrPayScreen";
import { WalletRequisitesScreen } from "../screens/wallet/WalletRequisitesScreen";
import { WalletTopUpScreen } from "../screens/wallet/WalletTopUpScreen";
import { WalletTransactionsScreen } from "../screens/wallet/WalletTransactionsScreen";

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Orders: undefined;
  Settings: undefined;
  MorphAiSettings: undefined;
  PersonalInfo: undefined;
  Security: undefined;
  SecurityPassword: undefined;
  SecuritySessions: undefined;
  NotificationPrefs: undefined;
  Notifications: undefined;
  HelpCenter: undefined;
  Subscriptions: undefined;
  MorphPaywall: { reason?: import("../lib/morph-return").PaywallReason; returnTo?: import("../lib/morph-return").MorphReturnTo } | undefined;
  Referrals: undefined;
  WalletGate: undefined;
  WalletHome: undefined;
  WalletTopUp: undefined;
  WalletGift: undefined;
  WalletGiftAmount: {
    recipientUserId: number;
    recipientName: string;
    recipientPhone?: string | null;
    recipientWallet?: string;
  };
  WalletGifts: undefined;
  WalletMore: undefined;
  WalletQrPay: undefined;
  WalletTransactions: undefined;
  WalletRequisites: undefined;
  WalletFreeze: undefined;
  WalletFaq: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

/** Profil oqimi — mehmon uchun login; autentifikatsiyadan keyin stack. */
export function ProfileStack() {
  const { isAuthenticated } = useAuth();
  const { shell } = useAppShell();
  const { colors } = useMorphAppearance();
  const morphHome = shell === "morph";

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: {
          backgroundColor: morphHome ? colors.bg : "#FFFFFF",
        },
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileHomeScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="MorphAiSettings" component={MorphAiSettingsScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Security" component={SecurityScreen} />
      <Stack.Screen name="SecurityPassword" component={SecurityPasswordScreen} />
      <Stack.Screen name="SecuritySessions" component={SecuritySessionsScreen} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Stack.Screen name="Referrals" component={ReferralScreen} />
      <Stack.Screen
        name="MorphPaywall"
        component={MorphPaywallScreen}
        options={{ contentStyle: { backgroundColor: "#FFFFFF" } }}
      />
      <Stack.Screen name="WalletGate" component={WalletGateScreen} />
      <Stack.Screen
        name="WalletHome"
        component={WalletHomeScreen}
        options={{ contentStyle: { backgroundColor: "#F7F5F2" } }}
      />
      <Stack.Screen
        name="WalletTopUp"
        component={WalletTopUpScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletGift"
        component={WalletGiftScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletGiftAmount"
        component={WalletGiftAmountScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletGifts"
        component={WalletGiftsScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletMore"
        component={WalletMoreScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletQrPay"
        component={WalletQrPayScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletTransactions"
        component={WalletTransactionsScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletRequisites"
        component={WalletRequisitesScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
      <Stack.Screen
        name="WalletFreeze"
        component={WalletFreezeScreen}
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" },
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
      <Stack.Screen
        name="WalletFaq"
        component={WalletFaqScreen}
        options={{ animation: "slide_from_right", gestureEnabled: true, fullScreenGestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
