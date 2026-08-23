import { Easing, Platform } from "react-native";
import {
  CardStyleInterpolators,
  createStackNavigator,
  type StackNavigationOptions,
} from "@react-navigation/stack";
import { WalletFaqScreen } from "../screens/wallet/WalletFaqScreen";
import { WalletFreezeScreen } from "../screens/wallet/WalletFreezeScreen";
import { WalletGateScreen } from "../screens/wallet/WalletGateScreen";
import { WalletGiftAmountScreen } from "../screens/wallet/WalletGiftAmountScreen";
import { WalletGiftScreen } from "../screens/wallet/WalletGiftScreen";
import { WalletGiftsScreen } from "../screens/wallet/WalletGiftsScreen";
import { WalletHomeScreen } from "../screens/wallet/WalletHomeScreen";
import { WalletMoreScreen } from "../screens/wallet/WalletMoreScreen";
import { WalletQrPayScreen } from "../screens/wallet/WalletQrPayScreen";
import { WalletRequisitesScreen } from "../screens/wallet/WalletRequisitesScreen";
import { WalletTopUpScreen } from "../screens/wallet/WalletTopUpScreen";
import { WalletTransactionsScreen } from "../screens/wallet/WalletTransactionsScreen";

/** Wallet route params — ProfileStack ichida ham shu kalitlar ishlatiladi. */
export type WalletStackParamList = {
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

export type WalletScreenName = keyof WalletStackParamList;

const Stack = createStackNavigator<WalletStackParamList>();

const openRight = {
  animation: "timing" as const,
  config: { duration: 320, easing: Easing.out(Easing.cubic) },
};
const closeRight = {
  animation: "timing" as const,
  config: { duration: 280, easing: Easing.in(Easing.cubic) },
};
const openBottom = {
  animation: "timing" as const,
  config: { duration: 480, easing: Easing.out(Easing.cubic) },
};
const closeBottom = {
  animation: "timing" as const,
  config: { duration: 360, easing: Easing.in(Easing.cubic) },
};

const fromRight: StackNavigationOptions = {
  gestureEnabled: true,
  fullScreenGestureEnabled: Platform.OS !== "web",
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  transitionSpec: { open: openRight, close: closeRight },
};

const fromBottom: StackNavigationOptions = {
  gestureEnabled: true,
  fullScreenGestureEnabled: Platform.OS !== "web",
  cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
  transitionSpec: { open: openBottom, close: closeBottom },
};

const freezeSheet: StackNavigationOptions = {
  presentation: "transparentModal",
  cardStyle: { backgroundColor: "transparent" },
  cardOverlayEnabled: false,
  animationEnabled: false,
  gestureEnabled: false,
};

export function WalletStack() {
  return (
    <Stack.Navigator
      initialRouteName="WalletGate"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#FFFFFF" },
        ...fromRight,
      }}
    >
      <Stack.Screen name="WalletGate" component={WalletGateScreen} />
      <Stack.Screen
        name="WalletHome"
        component={WalletHomeScreen}
        options={{ cardStyle: { backgroundColor: "#F7F5F2" } }}
      />
      <Stack.Screen name="WalletTopUp" component={WalletTopUpScreen} options={fromRight} />
      <Stack.Screen name="WalletGift" component={WalletGiftScreen} options={fromRight} />
      <Stack.Screen name="WalletGiftAmount" component={WalletGiftAmountScreen} options={fromRight} />
      <Stack.Screen name="WalletGifts" component={WalletGiftsScreen} options={fromRight} />
      <Stack.Screen name="WalletMore" component={WalletMoreScreen} options={fromRight} />
      <Stack.Screen name="WalletQrPay" component={WalletQrPayScreen} options={fromBottom} />
      <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} options={fromRight} />
      <Stack.Screen name="WalletRequisites" component={WalletRequisitesScreen} options={fromRight} />
      <Stack.Screen name="WalletFreeze" component={WalletFreezeScreen} options={freezeSheet} />
      <Stack.Screen name="WalletFaq" component={WalletFaqScreen} options={fromRight} />
    </Stack.Navigator>
  );
}
