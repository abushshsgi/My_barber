import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeBackButton } from "../../components/ui/NativeBackButton";
import { useProfileData } from "../../hooks/useProfileData";
import { timeAgo } from "../../api/user";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { safeBottom, safeTop } from "../../lib/safe-area";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const data = useProfileData();

  return (
    <View style={[styles.root, { paddingTop: safeTop(insets.top, 0) }]}>
      <View style={styles.header}>
        <NativeBackButton onPress={() => navigation.goBack()} />
        <Text style={styles.title}>Bildirishnomalar</Text>
        <Pressable style={styles.filterBtn}>
          <Ionicons name="options-outline" size={18} color={colors.fg} />
        </Pressable>
      </View>

      <FlatList
        data={data.notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Bildirishnomalar yo'q</Text>
            <Text style={styles.emptySub}>
              Yangi bron, to'lov va chat xabarlari shu yerda chiqadi.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const unread = !(item.is_read ?? item.read);
          const body = item.body || item.message || "";
          return (
            <View style={styles.item}>
              <View style={styles.iconWrap}>
                {unread ? <View style={styles.dot} /> : null}
                <Ionicons name="calendar" size={16} color={colors.fg} />
              </View>
              <View style={styles.textCol}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                {body ? (
                  <Text style={styles.itemBody} numberOfLines={2}>
                    {body}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.ago}>{timeAgo(item.created_at)}</Text>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
    gap: moderateScale(10),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    fontSize: fontSize(17),
    fontWeight: "700",
    color: colors.fg,
    textAlign: "center",
  },
  filterBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingBottom: verticalScale(24) },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(12),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: verticalScale(4),
    left: scale(4),
    width: scale(8),
    height: scale(8),
    borderRadius: moderateScale(4),
    backgroundColor: colors.fg,
    zIndex: 1,
  },
  textCol: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: fontSize(15), fontWeight: "700", color: colors.fg },
  itemBody: { marginTop: verticalScale(3), fontSize: fontSize(13), lineHeight: fontSize(17), color: colors.muted },
  ago: { fontSize: fontSize(12), color: colors.muted, marginTop: verticalScale(2) },
  empty: { padding: moderateScale(40), alignItems: "center" },
  emptyTitle: { fontSize: fontSize(17), fontWeight: "700", color: colors.fg, marginBottom: verticalScale(6) },
  emptySub: { fontSize: fontSize(13), color: colors.muted, textAlign: "center", lineHeight: fontSize(18) },
});
