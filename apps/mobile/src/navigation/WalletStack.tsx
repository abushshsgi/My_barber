import { Platform } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
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
import {
  walletFreezeSheet,
  walletFromBottom,
  walletFromRight,
} from "./walletTransitions";

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
  WalletFreeze: { isFrozen: boolean };
  WalletFaq: undefined;
};

export type WalletScreenName = keyof WalletStackParamList;

const Stack = createStackNavigator<WalletStackParamList>();

export function WalletStack() {
  return (
    <Stack.Navigator
      initialRouteName="WalletGate"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: "#FFFFFF" },
        detachPreviousScreen: Platform.OS !== "web",
        ...walletFromRight,
      }}
    >
      <Stack.Screen name="WalletGate" component={WalletGateScreen} />
      <Stack.Screen
        name="WalletHome"
        component={WalletHomeScreen}
        options={{ cardStyle: { backgroundColor: "#F7F5F2" } }}
      />
      <Stack.Screen name="WalletTopUp" component={WalletTopUpScreen} options={walletFromRight} />
      <Stack.Screen name="WalletGift" component={WalletGiftScreen} options={walletFromRight} />
      <Stack.Screen name="WalletGiftAmount" component={WalletGiftAmountScreen} options={walletFromRight} />
      <Stack.Screen name="WalletGifts" component={WalletGiftsScreen} options={walletFromRight} />
      <Stack.Screen name="WalletMore" component={WalletMoreScreen} options={walletFromRight} />
      <Stack.Screen name="WalletQrPay" component={WalletQrPayScreen} options={walletFromBottom} />
      <Stack.Screen name="WalletTransactions" component={WalletTransactionsScreen} options={walletFromRight} />
      <Stack.Screen name="WalletRequisites" component={WalletRequisitesScreen} options={walletFromRight} />
      <Stack.Screen name="WalletFreeze" component={WalletFreezeScreen} options={walletFreezeSheet} />
      <Stack.Screen name="WalletFaq" component={WalletFaqScreen} options={walletFromRight} />
    </Stack.Navigator>
  );
}
