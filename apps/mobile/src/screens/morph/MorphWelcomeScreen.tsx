import { useEffect } from "react";
import { View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { markMorphTryOnIntroDone } from "../../lib/morph-onboarding";
import type { MorphStackParamList } from "../../navigation/MorphStack";

type Props = NativeStackScreenProps<MorphStackParamList, "MorphWelcome">;

/** Eski Welcome/Guide o‘rniga to‘g‘ridan-to‘g‘ri Try-on capture. */
export function MorphWelcomeScreen({ navigation }: Props) {
  useEffect(() => {
    void markMorphTryOnIntroDone();
    navigation.replace("MorphCapture");
  }, [navigation]);

  return <View style={{ flex: 1, backgroundColor: "#111111" }} />;
}
