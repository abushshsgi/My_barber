import { useEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAppShell } from "../../lib/AppShellContext";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

type Props = NativeStackScreenProps<ProfileStackParamList, "PersonalInfo">;

/** Eski route — shaxsiy ma'lumotlar endi sozlamalar ichida. */
export function PersonalInfoScreen({ navigation }: Props) {
  const { shell } = useAppShell();
  useEffect(() => {
    navigation.replace(shell === "morph" ? "MorphAiSettings" : "Settings");
  }, [navigation, shell]);
  return null;
}
