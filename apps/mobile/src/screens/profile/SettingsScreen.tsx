import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { HeaderPill, NativeHeader } from "../../components/ui/NativeHeader";
import { SettingsGroup, SettingsRow } from "../../components/ui/SettingsKit";
import { currentLang, setAppLanguage } from "../../i18n/config";
import type { AppLang } from "../../lib/guest";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const lang = currentLang();

  const pickLanguage = () => {
    Alert.alert(t("profile.language"), undefined, [
      {
        text: t("profile.languageRu"),
        onPress: () => void setAppLanguage("ru"),
      },
      {
        text: t("profile.languageUz"),
        onPress: () => void setAppLanguage("uz"),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  return (
    <View style={styles.root}>
      <NativeHeader
        title={t("profile.settingsTitle")}
        onBack={() => navigation.goBack()}
        right={
          <HeaderPill
            label={t("profile.subscription")}
            dark
            icon={<Ionicons name="sparkles" size={12} color="#FFF" />}
            onPress={() => navigation.navigate("Subscriptions")}
          />
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SettingsGroup title={t("profile.accountGroup")}>
          <SettingsRow
            title={t("profile.personalInfo")}
            icon="person-outline"
            onPress={() => navigation.navigate("PersonalInfo")}
          />
          <SettingsRow
            title={t("profile.security")}
            icon="lock-closed-outline"
            onPress={() => navigation.navigate("Security")}
          />
          <SettingsRow
            title={t("profile.privacyRow")}
            icon="shield-checkmark-outline"
            onPress={() => undefined}
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.prefsGroup")}>
          <SettingsRow
            title={t("profile.notificationPrefs")}
            icon="notifications-outline"
            onPress={() => navigation.navigate("NotificationPrefs")}
          />
          <SettingsRow
            title={t("profile.languagePrefs")}
            subtitle={lang === "ru" ? t("profile.languageRu") : t("profile.languageUz")}
            icon="globe-outline"
            onPress={pickLanguage}
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.paymentGroup")}>
          <SettingsRow title={t("profile.paymentMethods")} icon="card-outline" onPress={() => undefined} />
          <SettingsRow
            title={t("profile.subscriptions")}
            icon="sync-outline"
            onPress={() => navigation.navigate("Subscriptions")}
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.otherGroup")}>
          <SettingsRow title={t("profile.addresses")} icon="location-outline" onPress={() => undefined} />
          <SettingsRow title={t("profile.familyProfile")} icon="people-outline" onPress={() => undefined} />
          <SettingsRow
            title={t("profile.helpCenter")}
            icon="help-circle-outline"
            onPress={() => navigation.navigate("HelpCenter")}
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
