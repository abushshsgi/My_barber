import { useEffect } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { readMorphIntroStep } from "../../lib/morph-onboarding";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphWelcome">;

/** Eski Welcome — yangi 3 slaydli carouselga yo‘naltiradi. */
export function MorphWelcomeScreen({ navigation }: Props) {
  useEffect(() => {
    let alive = true;
    void readMorphIntroStep().then((startIndex) => {
      if (!alive) return;
      navigation.replace("MorphGuide", { startIndex });
    });
    return () => {
      alive = false;
    };
  }, [navigation]);

  return <View style={{ flex: 1, backgroundColor: "#0B0B0C" }} />;
}
