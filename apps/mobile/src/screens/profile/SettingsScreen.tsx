import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, View } from "react-native";
import { useShellTheme } from "../../lib/useShellTheme";
import { useTranslation } from "react-i18next";
import { HeaderPill, NativeHeader } from "../../components/ui/NativeHeader";
import { SettingsGroup, SettingsRow } from "../../components/ui/SettingsKit";
import { PersonalInfoPanel } from "./PersonalInfoPanel";
import { setAppLanguage, type AppLang } from "../../i18n/config";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import {
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Settings">;

const LANGS: { id: AppLang; labelKey: "profile.languageUz" | "profile.languageRu" | "profile.languageEn" }[] = [
  { id: "uz", labelKey: "profile.languageUz" },
  { id: "ru", labelKey: "profile.languageRu" },
  { id: "en", labelKey: "profile.languageEn" },
];

export function SettingsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const pal = useShellTheme();
  const lang = (i18n.resolvedLanguage || i18n.language || "uz").slice(0, 2) as AppLang;

  const chooseLanguage = (next: AppLang) => {
    if (next === lang) return;
    void setAppLanguage(next).catch(() => undefined);
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
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
        <SettingsGroup title={t("profile.personalInfo")}>
          <View style={styles.infoPad}>
            <PersonalInfoPanel />
          </View>
        </SettingsGroup>

        <SettingsGroup title={t("profile.accountGroup")}>
          <SettingsRow
            title={t("profile.security")}
            icon="lock-closed-outline"
            onPress={() => navigation.navigate("Security")}
          />
          <SettingsRow
            title={t("profile.privacyRow")}
            icon="shield-checkmark-outline"
            onPress={() => navigation.navigate("PrivacyPolicy")}
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.prefsGroup")}>
          <SettingsRow
            title={t("profile.notificationPrefs")}
            icon="notifications-outline"
            onPress={() => navigation.navigate("NotificationPrefs")}
            last
          />
        </SettingsGroup>

        <SettingsGroup title={t("profile.language")}>
          {LANGS.map((item, index) => (
            <SettingsRow
              key={item.id}
              title={t(item.labelKey)}
              icon="globe-outline"
              onPress={() => chooseLanguage(item.id)}
              last={index === LANGS.length - 1}
              trailing={
                lang === item.id ? (
                  <Ionicons name="checkmark" size={18} color={pal.fg} />
                ) : (
                  <View style={styles.langSpacer} />
                )
              }
            />
          ))}
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
  content: { padding: moderateScale(16), paddingBottom: verticalScale(32) },
  infoPad: { paddingHorizontal: scale(14), paddingBottom: verticalScale(10) },
  langSpacer: { width: 18 },
});
