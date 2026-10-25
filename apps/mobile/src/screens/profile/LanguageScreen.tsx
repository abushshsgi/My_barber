import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { useShellTheme } from "../../lib/useShellTheme";
import { useTranslation } from "react-i18next";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { SettingsGroup, SettingsRow } from "../../components/ui/SettingsKit";
import { setAppLanguage, type AppLang } from "../../i18n/config";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import {
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Language">;

const LANGS: { id: AppLang; labelKey: "profile.languageUz" | "profile.languageRu" | "profile.languageEn" }[] = [
  { id: "uz", labelKey: "profile.languageUz" },
  { id: "ru", labelKey: "profile.languageRu" },
  { id: "en", labelKey: "profile.languageEn" },
];

export function LanguageScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const pal = useShellTheme();
  const lang = (i18n.resolvedLanguage || i18n.language || "uz").slice(0, 2) as AppLang;

  const chooseLanguage = (next: AppLang) => {
    if (next === lang) return;
    void setAppLanguage(next).then(() => navigation.goBack());
  };

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <NativeHeader
        title={t("profile.language")}
        onBack={() => navigation.goBack()}
      />
      <View style={styles.content}>
        <SettingsGroup>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
  },
  langSpacer: { width: scale(18) },
});
