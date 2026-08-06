import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { WalletGateScreen } from "../screens/wallet/WalletGateScreen";
import { WalletGiftScreen } from "../screens/wallet/WalletGiftScreen";
import { WalletGiftsScreen } from "../screens/wallet/WalletGiftsScreen";
import { WalletHomeScreen } from "../screens/wallet/WalletHomeScreen";
import { WalletQrPayScreen } from "../screens/wallet/WalletQrPayScreen";
import { WalletTopUpScreen } from "../screens/wallet/WalletTopUpScreen";
import { WalletTransactionsScreen } from "../screens/wallet/WalletTransactionsScreen";

/** Wallet route params — ProfileStack ichida ham shu kalitlar ishlatiladi. */
export type WalletStackParamList = {
  WalletGate: undefined;
  WalletHome: undefined;
  WalletTopUp: undefined;
  WalletGift: undefined;
  WalletGifts: undefined;
  WalletQrPay: undefined;
  WalletTransactions: undefined;
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
      <Stack.Screen name="WalletHome" component={WalletHomeScreen} />
      <Stack.Screen name="WalletTopUp" component={WalletTopUpScreen} />
      <Stack.Screen name="WalletGift" component={WalletGiftScreen} />
      <Stack.Screen name="WalletGifts" component={WalletGiftsScreen} />
      <Stack.Screen name="WalletQrPay" component={WalletQrPayScreen} />
      <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} />
    </Stack.Navigator>
  );
}
