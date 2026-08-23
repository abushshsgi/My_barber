import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphCareProductDetailScreen } from "../screens/morph/MorphCareProductDetailScreen";
import { MorphCareProductsScreen } from "../screens/morph/MorphCareProductsScreen";
import { MorphIngredientScreen } from "../screens/morph/MorphIngredientScreen";

export type MorphIngredientStackParamList = {
  IngredientScan: undefined;
  CareProducts: { q?: string } | undefined;
  CareProductDetail: { productId: number };
};

const Stack = createNativeStackNavigator<MorphIngredientStackParamList>();

export function MorphIngredientStack() {
  return (
    <Stack.Navigator
      initialRouteName="IngredientScan"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#050505" },
      }}
    >
      <Stack.Screen name="IngredientScan" component={MorphIngredientScreen} />
      <Stack.Screen
        name="CareProducts"
        // Care stack bilan bir xil UI — param list mos.
        component={MorphCareProductsScreen as React.ComponentType<any>}
      />
      <Stack.Screen
        name="CareProductDetail"
        component={MorphCareProductDetailScreen as React.ComponentType<any>}
      />
    </Stack.Navigator>
  );
}
