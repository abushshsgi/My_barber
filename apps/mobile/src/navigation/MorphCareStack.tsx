import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphCareProductDetailScreen } from "../screens/morph/MorphCareProductDetailScreen";
import { MorphCareProductGuideScreen } from "../screens/morph/MorphCareProductGuideScreen";
import { MorphCareProductsScreen } from "../screens/morph/MorphCareProductsScreen";
import { MorphCareScreen } from "../screens/morph/MorphCareScreen";
import { MorphCareWeatherScreen } from "../screens/morph/MorphCareWeatherScreen";

export type MorphCareStackParamList = {
  CareHome: undefined;
  CareWeather: undefined;
  CareProducts: { q?: string } | undefined;
  CareProductDetail: { productId: number };
  CareProductGuide: {
    productId?: number;
    productTitle?: string;
    brand?: string;
    category?: string;
    usageText?: string;
    durationMinutes?: number;
    imageUrl?: string;
  };
};

const Stack = createNativeStackNavigator<MorphCareStackParamList>();

export function MorphCareStack() {
  return (
    <Stack.Navigator
      initialRouteName="CareHome"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#050505" },
      }}
    >
      <Stack.Screen name="CareHome" component={MorphCareScreen} />
      <Stack.Screen name="CareWeather" component={MorphCareWeatherScreen} />
      <Stack.Screen name="CareProducts" component={MorphCareProductsScreen} />
      <Stack.Screen name="CareProductDetail" component={MorphCareProductDetailScreen} />
      <Stack.Screen name="CareProductGuide" component={MorphCareProductGuideScreen} />
    </Stack.Navigator>
  );
}
