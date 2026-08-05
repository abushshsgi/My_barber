import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { ToggleRow } from "../../components/ui/SettingsKit";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "NotificationPrefs">;

export function NotificationPrefsScreen({ navigation }: Props) {
  const [booking, setBooking] = useState(true);
  const [chat, setChat] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  return (
    <View style={styles.root}>
      <NativeHeader
        title="Bildirishnoma afzalliklari"
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        <ToggleRow title="Buyurtma eslatmalari" value={booking} onValueChange={setBooking} />
        <ToggleRow title="Chat bildirishnomalari" value={chat} onValueChange={setChat} />
        <ToggleRow
          title="Animatsiyani kamaytirish"
          value={reduceMotion}
          onValueChange={setReduceMotion}
          last
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: 4 },
});
