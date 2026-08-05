import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { HeaderPill, NativeHeader } from "../../components/ui/NativeHeader";
import { SettingsGroup, SettingsRow } from "../../components/ui/SettingsKit";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <NativeHeader
        title="Hisob sozlamalari"
        onBack={() => navigation.goBack()}
        right={
          <HeaderPill
            label="Obuna"
            dark
            icon={<Ionicons name="sparkles" size={12} color="#FFF" />}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup title="Hisob">
          <SettingsRow
            title="Shaxsiy ma'lumotlar"
            icon="person-outline"
            onPress={() => navigation.navigate("PersonalInfo")}
          />
          <SettingsRow
            title="Kirish va xavfsizlik"
            icon="lock-closed-outline"
            onPress={() => navigation.navigate("Security")}
          />
          <SettingsRow
            title="Maxfiylik"
            icon="shield-checkmark-outline"
            onPress={() => undefined}
            last
          />
        </SettingsGroup>

        <SettingsGroup title="Afzalliklar">
          <SettingsRow
            title="Bildirishnoma afzalliklari"
            icon="notifications-outline"
            onPress={() => navigation.navigate("NotificationPrefs")}
          />
          <SettingsRow
            title="Til va afzalliklar"
            icon="globe-outline"
            onPress={() => undefined}
            last
          />
        </SettingsGroup>

        <SettingsGroup title="To'lov va obuna">
          <SettingsRow title="To'lov usullari" icon="card-outline" onPress={() => undefined} />
          <SettingsRow
            title="Obunalar"
            icon="sync-outline"
            onPress={() => undefined}
            last
          />
        </SettingsGroup>

        <SettingsGroup title="Boshqa">
          <SettingsRow title="Manzillar" icon="location-outline" onPress={() => undefined} />
          <SettingsRow title="Oilaviy profil" icon="people-outline" onPress={() => undefined} />
          <SettingsRow
            title="Yordam markazi"
            icon="help-circle-outline"
            onPress={() => undefined}
            last
          />
        </SettingsGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
});
