import { createNativeStackNavigator } from "@react-navigation/native-stack";
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

const Stack = createNativeStackNavigator<WalletStackParamList>();

const bottomSheetOpts = {
  presentation: "transparentModal" as const,
  animation: "slide_from_bottom" as const,
  contentStyle: { backgroundColor: "transparent" },
  gestureEnabled: true,
  gestureDirection: "vertical" as const,
};

const fromBottomOpts = {
  animation: "slide_from_bottom" as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

const fromRightOpts = {
  animation: "slide_from_right" as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
};

export function WalletStack() {
  return (
    <Stack.Navigator
      initialRouteName="WalletGate"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="WalletGate" component={WalletGateScreen} />
      <Stack.Screen
        name="WalletHome"
        component={WalletHomeScreen}
        options={{ contentStyle: { backgroundColor: "#F7F5F2" } }}
      />
      <Stack.Screen name="WalletTopUp" component={WalletTopUpScreen} options={fromRightOpts} />
      <Stack.Screen name="WalletGift" component={WalletGiftScreen} options={fromRightOpts} />
      <Stack.Screen name="WalletGiftAmount" component={WalletGiftAmountScreen} options={fromRightOpts} />
      <Stack.Screen name="WalletGifts" component={WalletGiftsScreen} options={fromRightOpts} />
      <Stack.Screen name="WalletMore" component={WalletMoreScreen} options={fromRightOpts} />
      <Stack.Screen name="WalletQrPay" component={WalletQrPayScreen} options={fromBottomOpts} />
      <Stack.Screen
        name="WalletTransactions"
        component={WalletTransactionsScreen}
        options={fromRightOpts}
      />
      <Stack.Screen name="WalletRequisites" component={WalletRequisitesScreen} options={fromRightOpts} />
      <Stack.Screen name="WalletFreeze" component={WalletFreezeScreen} options={bottomSheetOpts} />
      <Stack.Screen name="WalletFaq" component={WalletFaqScreen} options={fromRightOpts} />
    </Stack.Navigator>
  );
}
