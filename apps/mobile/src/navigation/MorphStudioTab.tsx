import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphPaywallScreen } from "../screens/morph/MorphPaywallScreen";
import { MorphStudioScreen } from "../screens/morph/MorphStudioScreen";

export type MorphStudioTabParamList = {
  MorphStudioHome: undefined;
  MorphPaywall: undefined;
};

const Stack = createNativeStackNavigator<MorphStudioTabParamList>();

/** Dock dagi Studio tabi. */
export function MorphStudioTab() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#0A0A0A" },
      }}
    >
      <Stack.Screen name="MorphStudioHome" component={MorphStudioScreen} />
      <Stack.Screen name="MorphPaywall" component={MorphPaywallScreen} />
    </Stack.Navigator>
  );
}
