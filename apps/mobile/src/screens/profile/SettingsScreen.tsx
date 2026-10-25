import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { wipeMorphChatsEverywhere } from "../../hooks/useMorphChat";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { MorphChatSettingsScreen } from "../morph/MorphChatSettingsScreen";

type Props = NativeStackScreenProps<ProfileStackParamList, "Settings">;

/** Profil va boshqa Morph ekranlardan ochiladigan umumiy Morf AI sozlamalari. */
export function SettingsScreen({ navigation }: Props) {
  return (
    <MorphChatSettingsScreen
      limits={null}
      threadCount={0}
      threads={[]}
      onClose={() => navigation.goBack()}
      onClearAllChats={() => wipeMorphChatsEverywhere()}
      onOpenSubscription={() => navigation.navigate("Subscriptions")}
      onSaveHistoryOff={() => void wipeMorphChatsEverywhere()}
    />
  );
}

