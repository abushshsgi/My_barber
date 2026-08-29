import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphCareProductDetailScreen } from "../screens/morph/MorphCareProductDetailScreen";
import { MorphIngredientScreen } from "../screens/morph/MorphIngredientScreen";

export type MorphIngredientStackParamList = {
  IngredientScan: undefined;
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
        name="CareProductDetail"
        component={MorphCareProductDetailScreen as React.ComponentType<any>}
        options={{ contentStyle: { backgroundColor: "#FFFFFF" } }}
      />
    </Stack.Navigator>
  );
}
