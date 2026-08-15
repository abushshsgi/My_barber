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

type Props = NativeStackScreenProps<ProfileStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const data = useProfileData();

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colors.fg,
    textAlign: "center",
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingBottom: 24 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.fg,
    zIndex: 1,
  },
  textCol: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: colors.fg },
  itemBody: { marginTop: 3, fontSize: 13, lineHeight: 17, color: colors.muted },
  ago: { fontSize: 12, color: colors.muted, marginTop: 2 },
  empty: { padding: 40, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.fg, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 18 },
});
