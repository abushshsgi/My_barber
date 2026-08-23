import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WalletGateScreen } from "../screens/wallet/WalletGateScreen";
import { WalletGiftAmountScreen } from "../screens/wallet/WalletGiftAmountScreen";
import { WalletGiftScreen } from "../screens/wallet/WalletGiftScreen";
import { WalletGiftSendScreen } from "../screens/wallet/WalletGiftSendScreen";
import { WalletGiftsScreen } from "../screens/wallet/WalletGiftsScreen";
import { WalletHomeScreen } from "../screens/wallet/WalletHomeScreen";
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
  WalletGiftSend: { designId: string; amount: number };
  WalletGifts: undefined;
  WalletQrPay: undefined;
  WalletTransactions: undefined;
  WalletRequisites: undefined;
};

export type WalletScreenName = keyof WalletStackParamList;

const Stack = createNativeStackNavigator<WalletStackParamList>();

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
      <Stack.Screen name="WalletTopUp" component={WalletTopUpScreen} />
      <Stack.Screen name="WalletGift" component={WalletGiftScreen} />
      <Stack.Screen name="WalletGiftAmount" component={WalletGiftAmountScreen} />
      <Stack.Screen name="WalletGiftSend" component={WalletGiftSendScreen} />
      <Stack.Screen name="WalletGifts" component={WalletGiftsScreen} />
      <Stack.Screen name="WalletQrPay" component={WalletQrPayScreen} />
      <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} />
      <Stack.Screen name="WalletRequisites" component={WalletRequisitesScreen} />
    </Stack.Navigator>
  );
}
