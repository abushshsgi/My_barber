import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { TermsOfUseView } from "../../components/legal/TermsOfUseView";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

type Props = NativeStackScreenProps<ProfileStackParamList, "Terms">;

export function TermsScreen({ navigation }: Props) {
  return <TermsOfUseView onBack={() => navigation.goBack()} />;
}
