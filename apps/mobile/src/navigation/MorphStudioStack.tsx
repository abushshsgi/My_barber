import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphPaywallScreen } from "../screens/morph/MorphPaywallScreen";
import { MorphStudioScreen } from "../screens/morph/MorphStudioScreen";
import type { MorphStackParamList } from "./MorphStack";

const Stack = createNativeStackNavigator<MorphStackParamList>();

/** Morph AI Studio tab — alohida stack, session RootTabs dan keladi. */
export function MorphStudioStack() {
  return (
    <Stack.Navigator
      initialRouteName="MorphStudio"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#0A0A0A" },
      }}
    >
      <Stack.Screen name="MorphStudio" component={MorphStudioScreen} />
      <Stack.Screen name="MorphPaywall" component={MorphPaywallScreen} />
    </Stack.Navigator>
  );
}
