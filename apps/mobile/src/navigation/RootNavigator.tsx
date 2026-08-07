import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NavigatorScreenParams } from "@react-navigation/native";
import { BookingScreen } from "../screens/BookingScreen";
import { BookingSuccessScreen } from "../screens/BookingSuccessScreen";
import { SalonDetailScreen } from "../screens/SalonDetailScreen";
import { RootTabs, type RootTabParamList } from "./RootTabs";

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  SalonDetail: { salonId: string; distanceKm?: number };
  Booking: { salonId: string };
  BookingSuccess: {
    bookingId: string;
    salonName: string;
    whenLabel: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="MainTabs" component={RootTabs} />
      <Stack.Screen name="SalonDetail" component={SalonDetailScreen} />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
    </Stack.Navigator>
  );
}
