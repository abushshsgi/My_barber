import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphHistoryScreen } from "../screens/morph/MorphHistoryScreen";
import { MorphHomeScreen } from "../screens/morph/MorphHomeScreen";
import { MorphPaywallScreen } from "../screens/morph/MorphPaywallScreen";
import { MorphResultsScreen } from "../screens/morph/MorphResultsScreen";
import { MorphStudioScreen } from "../screens/morph/MorphStudioScreen";
import { MorphTryOnScreen } from "../screens/morph/MorphTryOnScreen";

export type MorphStackParamList = {
  MorphHome: undefined;
  MorphTryOn: undefined;
  MorphResults: undefined;
  MorphHistory: undefined;
  MorphStudio: undefined;
  MorphPaywall: undefined;
};

const Stack = createNativeStackNavigator<MorphStackParamList>();

/** Try-on hub tab. MorphSessionProvider RootTabs da. */
export function MorphStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#0A0A0A" },
      }}
    >
      <Stack.Screen name="MorphHome" component={MorphHomeScreen} />
      <Stack.Screen name="MorphTryOn" component={MorphTryOnScreen} />
      <Stack.Screen name="MorphResults" component={MorphResultsScreen} />
      <Stack.Screen name="MorphHistory" component={MorphHistoryScreen} />
      <Stack.Screen name="MorphStudio" component={MorphStudioScreen} />
      <Stack.Screen name="MorphPaywall" component={MorphPaywallScreen} />
    </Stack.Navigator>
  );
}
