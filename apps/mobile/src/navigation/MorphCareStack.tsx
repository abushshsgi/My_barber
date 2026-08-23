import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphCareProductDetailScreen } from "../screens/morph/MorphCareProductDetailScreen";
import { MorphCareProductsScreen } from "../screens/morph/MorphCareProductsScreen";
import { MorphCareScreen } from "../screens/morph/MorphCareScreen";

export type MorphCareStackParamList = {
  CareHome: undefined;
  CareProducts: { q?: string } | undefined;
  CareProductDetail: { productId: number };
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
      <Stack.Screen name="CareProducts" component={MorphCareProductsScreen} />
      <Stack.Screen name="CareProductDetail" component={MorphCareProductDetailScreen} />
    </Stack.Navigator>
  );
}
