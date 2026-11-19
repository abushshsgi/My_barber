import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphCareProductDetailScreen } from "../screens/morph/MorphCareProductDetailScreen";
import { HairAdvisor2IngredientDetailScreen } from "../screens/morph/hair-advisor/HairAdvisor2IngredientDetailScreen";
import { HairAdvisor2RecoverScreen } from "../screens/morph/hair-advisor/HairAdvisor2RecoverScreen";
import { HairAdvisor2IngredientsScreen } from "../screens/morph/hair-advisor/HairAdvisor2IngredientsScreen";
import { HairAdvisor2ResultScreen } from "../screens/morph/hair-advisor/HairAdvisor2ResultScreen";
import { HairAdvisorScannerScreen } from "../screens/morph/HairAdvisorScannerScreen";

export type MorphIngredientStackParamList = {
  IngredientScan: undefined;
  HairAdvisorResult: { scanId: string };
  HairAdvisorIngredients: { scanId: string };
  HairAdvisorRecover: { scanId: string };
  HairAdvisorIngredientDetail: { scanId: string; inci: string };
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
        contentStyle: { backgroundColor: "#080808" },
      }}
    >
      <Stack.Screen name="IngredientScan" component={HairAdvisorScannerScreen} options={{ contentStyle: { backgroundColor: "#080808" } }} />
      <Stack.Screen name="HairAdvisorResult" component={HairAdvisor2ResultScreen} options={{ contentStyle: { backgroundColor: "#FFFFFF" } }} />
      <Stack.Screen name="HairAdvisorIngredients" component={HairAdvisor2IngredientsScreen} options={{ contentStyle: { backgroundColor: "#FFFFFF" } }} />
      <Stack.Screen name="HairAdvisorRecover" component={HairAdvisor2RecoverScreen} options={{ contentStyle: { backgroundColor: "#FFFFFF" } }} />
      <Stack.Screen
        name="HairAdvisorIngredientDetail"
        component={HairAdvisor2IngredientDetailScreen}
        options={{ contentStyle: { backgroundColor: "#FFFFFF" } }}
      />
      <Stack.Screen
        name="CareProductDetail"
        component={MorphCareProductDetailScreen as React.ComponentType<any>}
        options={{ contentStyle: { backgroundColor: "#FFFFFF" } }}
      />
    </Stack.Navigator>
  );
}