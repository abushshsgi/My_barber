import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useProfileData } from "../../hooks/useProfileData";
import { useShellTheme } from "../../lib/useShellTheme";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Security">;

export function SecurityScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const data = useProfileData();
  const pal = useShellTheme();
  const hasPassword = Boolean(data.user?.has_password);
  const isGoogle = Boolean(data.user) && (data.user?.sign_in_method === "google" || !data.user?.phone);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />
      <NativeHeader title={t("profile.security")} onBack={() => navigation.goBack()} />
      <View style={[styles.card, { backgroundColor: pal.card, borderColor: pal.border }]}>
        {isGoogle ? (
          <SecRow
            pal={pal}
            icon="logo-google"
            title="Google hisobi"
            subtitle="Bu hisobda parol yo'q. Kirish Google orqali qoladi."
          />
        ) : (
          <SecRow
            pal={pal}
            icon="key"
            title={t("profile.password")}
            subtitle={
              hasPassword
                ? "Parol saqlangan. Keyingi safar shu parol bilan kirasiz."
                : "SMS o'rniga parol qo'ying va keyin shu parol bilan kiring."
            }
            action={hasPassword ? t("profile.change") : t("profile.add")}
            onAction={() => navigation.navigate("SecurityPassword")}
          />
        )}
        <SecRow
          pal={pal}
          icon={isGoogle ? "mail-outline" : "phone-portrait"}
          title={t("profile.signInMethod")}
          subtitle={isGoogle ? "Google" : t("profile.phoneVerified")}
        />
        <SecRow
          pal={pal}
          icon="laptop-outline"
          title={t("profile.sessions")}
          subtitle={t("profile.sessionsSub")}
          action={t("profile.manage")}
          onAction={() => navigation.navigate("SecuritySessions")}
          last
        />
      </View>
    </View>
  );
}

function SecRow({
  pal,
  icon,
  title,
  subtitle,
  action,
  onAction,
  last,
}: {
  pal: ReturnType<typeof useShellTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  last?: boolean;
}) {
  return (
    <View
      style={[styles.row, !last && styles.border, !last && { borderBottomColor: pal.border }]}
    >
      <View style={[styles.iconTile, { backgroundColor: pal.iconTile }]}>
        <Ionicons name={icon} size={18} color={pal.fg} />
      </View>
      <View style={styles.main}>
        <Text style={[styles.title, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: pal.accent, fontFamily: pal.font.fontFamily }]}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: {
    marginHorizontal: scale(16),
    marginTop: verticalScale(8),
    borderRadius: moderateScale(18),
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowOpacity: 0,
    elevation: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(14),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(16),
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth },
  iconTile: {
    width: scale(34),
    height: scale(34),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  main: { flex: 1 },
  title: { fontSize: fontSize(16), fontWeight: "700" },
  sub: { marginTop: verticalScale(4), fontSize: fontSize(13), lineHeight: fontSize(18) },
  action: { fontSize: fontSize(13), fontWeight: "600", marginTop: verticalScale(2) },
});
