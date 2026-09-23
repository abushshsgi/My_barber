import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrivacyPolicyView } from "../../components/legal/PrivacyPolicyView";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

type Props = NativeStackScreenProps<ProfileStackParamList, "PrivacyPolicy">;

export function PrivacyPolicyScreen({ navigation }: Props) {
  return <PrivacyPolicyView onBack={() => navigation.goBack()} />;
}
