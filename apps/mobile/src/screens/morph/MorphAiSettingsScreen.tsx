import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { wipeMorphChatsEverywhere } from "../../hooks/useMorphChat";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { MorphChatSettingsScreen } from "./MorphChatSettingsScreen";

type Props = NativeStackScreenProps<ProfileStackParamList, "MorphAiSettings">;

/** Profil va boshqa Morph ekranlardan ochiladigan umumiy Morf AI sozlamalari. */
export function MorphAiSettingsScreen({ navigation }: Props) {
  return (
    <MorphChatSettingsScreen
      limits={null}
      threadCount={0}
      threads={[]}
      onClose={() => navigation.goBack()}
      onClearAllChats={() => wipeMorphChatsEverywhere()}
      onOpenSubscription={() => navigation.navigate("MorphPaywall")}
      onSaveHistoryOff={() => void wipeMorphChatsEverywhere()}
    />
  );
}
