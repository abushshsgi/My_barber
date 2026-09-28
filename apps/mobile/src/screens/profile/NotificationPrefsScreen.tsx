import { useTranslation } from "react-i18next";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { ToggleRow } from "../../components/ui/SettingsKit";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import {
  scale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "NotificationPrefs">;

export function NotificationPrefsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [booking, setBooking] = useState(true);
  const [chat, setChat] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  return (
    <View style={styles.root}>
      <NativeHeader
        title={t("profile.notificationPrefs")}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.body}>
        <ToggleRow title={t("profile.orderReminders")} value={booking} onValueChange={setBooking} />
        <ToggleRow title={t("profile.chatNotifications")} value={chat} onValueChange={setChat} />
        <ToggleRow
          title={t("profile.reduceMotion")}
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
  body: { paddingHorizontal: scale(4) },
});
