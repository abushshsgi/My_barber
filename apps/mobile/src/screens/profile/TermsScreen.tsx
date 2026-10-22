import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { TermsView } from "../../components/legal/TermsView";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";

type Props = NativeStackScreenProps<ProfileStackParamList, "Terms">;

export function TermsScreen({ navigation }: Props) {
  return <TermsView onBack={() => navigation.goBack()} />;
}
