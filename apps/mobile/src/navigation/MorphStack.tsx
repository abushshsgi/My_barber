import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MorphGuideCarouselScreen } from "../screens/morph/MorphGuideCarouselScreen";
import { MorphHistoryScreen } from "../screens/morph/MorphHistoryScreen";
import { MorphHomeScreen } from "../screens/morph/MorphHomeScreen";
import { MorphPaywallScreen } from "../screens/morph/MorphPaywallScreen";
import { MorphPreviewScreen } from "../screens/morph/MorphPreviewScreen";
import { MorphResultsScreen } from "../screens/morph/MorphResultsScreen";
import { MorphStudioScreen } from "../screens/morph/MorphStudioScreen";
import { MorphTryOnScreen } from "../screens/morph/MorphTryOnScreen";
import { MorphWelcomeScreen } from "../screens/morph/MorphWelcomeScreen";

export type MorphStackParamList = {
  /** Selfie capture (qayta kirish). Tab nomi MorphTryOn dan farq qiladi. */
  MorphCapture: undefined;
  MorphWelcome: undefined;
  MorphGuide: undefined;
  /** Legacy hub — Try-on tab emas; Studio / namuna uchun. */
  MorphHome: undefined;
  MorphResults: undefined;
  MorphPreview: {
    styleId: string;
    title: string;
    match: number;
    imageUrl: string;
    previewImage?: string;
    salonId?: number | null;
    reason?: string;
  };
  MorphHistory: { generationId?: number } | undefined;
  MorphStudio: undefined;
  MorphPaywall: undefined;
};

const Stack = createNativeStackNavigator<MorphStackParamList>();

/** Try-on tab: birinchi marta Welcome → Guide; keyin MorphCapture. */
export function MorphStack() {
  return (
    <Stack.Navigator
      initialRouteName="MorphCapture"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#0A0A0A" },
      }}
    >
      <Stack.Screen name="MorphCapture" component={MorphTryOnScreen} />
      <Stack.Screen
        name="MorphWelcome"
        component={MorphWelcomeScreen}
        options={{
          animation: "fade",
          contentStyle: { backgroundColor: "#1A120E" },
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="MorphGuide"
        component={MorphGuideCarouselScreen}
        options={{ animation: "slide_from_bottom", gestureEnabled: false }}
      />
      <Stack.Screen name="MorphHome" component={MorphHomeScreen} />
      <Stack.Screen name="MorphResults" component={MorphResultsScreen} />
      <Stack.Screen
        name="MorphPreview"
        component={MorphPreviewScreen}
        options={{ animation: "slide_from_bottom", contentStyle: { backgroundColor: "#FFF" } }}
      />
      <Stack.Screen
        name="MorphHistory"
        component={MorphHistoryScreen}
        options={{ animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="MorphStudio" component={MorphStudioScreen} />
      <Stack.Screen name="MorphPaywall" component={MorphPaywallScreen} />
    </Stack.Navigator>
  );
}
