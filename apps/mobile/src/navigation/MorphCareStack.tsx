import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphCareMyProductsScreen } from "../screens/morph/MorphCareMyProductsScreen";
import { MorphCareAlbumScreen } from "../screens/morph/MorphCareAlbumScreen";
import { MorphCareGrowthTrackerScreen } from "../screens/morph/MorphCareGrowthTrackerScreen";
import { MorphCareProductDetailScreen } from "../screens/morph/MorphCareProductDetailScreen";
import { MorphCareProductGuideScreen } from "../screens/morph/MorphCareProductGuideScreen";
import { MorphCareScreen } from "../screens/morph/MorphCareScreen";
import { MorphCareWeatherScreen } from "../screens/morph/MorphCareWeatherScreen";

export type MorphCareStackParamList = {
  CareHome: { returnTo?: string; openSearch?: boolean; q?: string; retakeQuiz?: boolean } | undefined;
  CareWeather: undefined;
  CareGrowthTracker: undefined;
  CareAlbum: undefined;
  CareMyProducts: undefined;
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
        contentStyle: { backgroundColor: "#FFFFFF" },
      }}
    >
      <Stack.Screen name="CareHome" component={MorphCareScreen} />
      <Stack.Screen name="CareWeather" component={MorphCareWeatherScreen} />
      <Stack.Screen name="CareGrowthTracker" component={MorphCareGrowthTrackerScreen} />
      <Stack.Screen name="CareAlbum" component={MorphCareAlbumScreen} />
      <Stack.Screen name="CareMyProducts" component={MorphCareMyProductsScreen} />
      <Stack.Screen name="CareProductDetail" component={MorphCareProductDetailScreen} />
      <Stack.Screen name="CareProductGuide" component={MorphCareProductGuideScreen} />
    </Stack.Navigator>
  );
}
