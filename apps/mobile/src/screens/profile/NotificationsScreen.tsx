import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useProfileData } from "../../hooks/useProfileData";
import { timeAgo } from "../../api/user";
import { useShellTheme } from "../../lib/useShellTheme";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const pal = useShellTheme();
  const data = useProfileData();

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />
      <NativeHeader title="Bildirishnomalar" onBack={() => navigation.goBack()} />

      <FlatList
        data={data.notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: pal.iconTile }]}>
              <Ionicons name="notifications-off-outline" size={28} color={pal.fg} />
            </View>
            <Text style={[styles.emptyTitle, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
              {t("profile.noNotifications")}
            </Text>
            <Text style={[styles.emptySub, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
              Yangi bron, to'lov va chat xabarlari shu yerda chiqadi.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const unread = !(item.is_read ?? item.read);
          const body = item.body || item.message || "";
          return (
            <View style={[styles.item, { backgroundColor: pal.card, borderColor: pal.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: pal.iconTile }]}>
                {unread ? <View style={[styles.dot, { backgroundColor: pal.fg, borderColor: pal.card }]} /> : null}
                <Ionicons name="notifications-outline" size={16} color={pal.fg} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.itemTitle, { color: pal.fg, fontFamily: pal.font.fontFamily }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {body ? (
                  <Text style={[styles.itemBody, { color: pal.muted, fontFamily: pal.font.fontFamily }]} numberOfLines={2}>
                    {body}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.ago, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
                {timeAgo(item.created_at)}
              </Text>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(28),
    gap: moderateScale(10),
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
    padding: moderateScale(14),
    borderRadius: moderateScale(16),
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: verticalScale(2),
    right: scale(2),
    width: scale(8),
    height: scale(8),
    borderRadius: moderateScale(4),
    borderWidth: 1.5,
    zIndex: 1,
  },
  textCol: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: fontSize(15), fontWeight: "700" },
  itemBody: { marginTop: verticalScale(3), fontSize: fontSize(13), lineHeight: fontSize(18) },
  ago: { fontSize: fontSize(12), marginTop: verticalScale(2) },
  empty: {
    paddingTop: verticalScale(72),
    paddingHorizontal: moderateScale(28),
    alignItems: "center",
  },
  emptyIcon: {
    width: scale(72),
    height: scale(72),
    borderRadius: moderateScale(24),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  emptyTitle: { fontSize: fontSize(18), fontWeight: "800", marginBottom: verticalScale(6), textAlign: "center" },
  emptySub: { fontSize: fontSize(14), textAlign: "center", lineHeight: fontSize(20) },
});
