import { useCallback, useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import {
  fetchUserSessions,
  revokeOtherSessions,
  revokeUserSession,
  type ApiUserSession,
} from "../../api/sessions";
import { useShellTheme } from "../../lib/useShellTheme";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import {
  fontSize,
  moderateScale,
  verticalScale,
} from "../../utils/responsive";

type Props = NativeStackScreenProps<ProfileStackParamList, "SecuritySessions">;

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const time = `${hh}:${mm}`;
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (dayDiff === 0) return `Bugun, ${time}`;
  if (dayDiff === 1) return `Kecha, ${time}`;
  const mon = MONTHS[d.getMonth()] ?? "";
  if (d.getFullYear() === now.getFullYear()) return `${d.getDate()} ${mon}, ${time}`;
  return `${d.getDate()} ${mon} ${d.getFullYear()}, ${time}`;
}

export function SecuritySessionsScreen({ navigation }: Props) {
  const pal = useShellTheme();
  const [sessions, setSessions] = useState<ApiUserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | "others" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await fetchUserSessions());
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (id: number) => {
    setBusyId(id);
    setError(null);
    try {
      await revokeUserSession(id);
      setSessions((rows) => rows.filter((s) => s.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Xatolik");
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    setBusyId("others");
    setError(null);
    try {
      await revokeOtherSessions();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Xatolik");
    } finally {
      setBusyId(null);
    }
  };

  const others = sessions.filter((s) => !s.is_current).length;

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={pal.status} />
      <NativeHeader title="Faol sessiyalar" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <Text style={styles.err}>{error}</Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={pal.fg} style={{ marginTop: 24 }} />
        ) : sessions.length === 0 ? (
          <Text style={[styles.empty, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
            Faol sessiya yo'q.
          </Text>
        ) : (
          sessions.map((session) => (
            <View
              key={session.id}
              style={[
                styles.card,
                {
                  backgroundColor: pal.card,
                  borderColor: session.is_current ? pal.fg : pal.border,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconTile, { backgroundColor: pal.iconTile }]}>
                  <Ionicons
                    name={session.platform === "web" ? "laptop-outline" : "phone-portrait-outline"}
                    size={18}
                    color={pal.fg}
                  />
                </View>
                <View style={styles.cardMain}>
                  <Text style={[styles.device, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
                    {session.device_name}
                  </Text>
                  <Text style={[styles.meta, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
                    {session.platform}
                  </Text>
                </View>
                {session.is_current ? (
                  <View style={[styles.badge, { backgroundColor: pal.fg }]}>
                    <Text style={[styles.badgeText, { color: pal.bg }]}>Joriy</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.whenRow}>
                <Ionicons name="time-outline" size={14} color={pal.muted} />
                <Text style={[styles.meta, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
                  {formatWhen(session.last_seen_at)}
                </Text>
              </View>
              {session.is_current ? null : (
                <Pressable
                  onPress={() => void revoke(session.id)}
                  disabled={busyId === session.id}
                  style={[styles.revoke, { backgroundColor: "rgba(255,59,48,0.08)" }]}
                >
                  {busyId === session.id ? (
                    <ActivityIndicator color={pal.destructive} />
                  ) : (
                    <Text style={[styles.revokeText, { color: pal.destructive }]}>Bekor qilish</Text>
                  )}
                </Pressable>
              )}
            </View>
          ))
        )}
        {others > 0 ? (
          <Pressable
            onPress={() => void revokeOthers()}
            disabled={busyId === "others"}
            style={[styles.others, { borderColor: pal.border }]}
          >
            {busyId === "others" ? (
              <ActivityIndicator color={pal.fg} />
            ) : (
              <Text style={[styles.othersText, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
                Boshqa barcha sessiyalarni bekor qilish
              </Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: moderateScale(16), paddingBottom: verticalScale(40), gap: moderateScale(12) },
  err: { color: "#FF3B30", fontSize: fontSize(13), marginBottom: verticalScale(8) },
  empty: { fontSize: fontSize(14), marginTop: verticalScale(12) },
  card: {
    borderRadius: moderateScale(18),
    borderWidth: StyleSheet.hairlineWidth,
    padding: moderateScale(14),
    gap: moderateScale(10),
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: moderateScale(12) },
  cardMain: { flex: 1, minWidth: 0 },
  iconTile: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    borderRadius: moderateScale(999),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(3),
  },
  badgeText: { fontSize: fontSize(11), fontWeight: "700" },
  whenRow: { flexDirection: "row", alignItems: "center", gap: moderateScale(6) },
  device: { fontSize: fontSize(15), fontWeight: "700" },
  meta: { fontSize: fontSize(13), lineHeight: fontSize(18) },
  revoke: {
    alignSelf: "flex-start",
    minHeight: verticalScale(36),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  revokeText: { fontSize: fontSize(13), fontWeight: "700" },
  others: {
    marginTop: verticalScale(8),
    minHeight: verticalScale(48),
    borderRadius: moderateScale(14),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  othersText: { fontSize: fontSize(14), fontWeight: "700" },
});
