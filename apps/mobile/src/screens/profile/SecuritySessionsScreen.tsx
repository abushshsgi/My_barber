import { useCallback, useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
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

type Props = NativeStackScreenProps<ProfileStackParamList, "SecuritySessions">;

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
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
              style={[styles.card, { backgroundColor: pal.card, borderColor: pal.border }]}
            >
              <Text style={[styles.device, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
                {session.device_name}
              </Text>
              <Text style={[styles.meta, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
                {session.platform}
                {session.is_current ? " · Joriy" : ""}
              </Text>
              <Text style={[styles.meta, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
                Oxirgi faollik: {formatWhen(session.last_seen_at)}
              </Text>
              {session.is_current ? null : (
                <Pressable
                  onPress={() => void revoke(session.id)}
                  disabled={busyId === session.id}
                  style={styles.revoke}
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
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  err: { color: "#FF3B30", fontSize: 13, marginBottom: 8 },
  empty: { fontSize: 14, marginTop: 12 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
    shadowOpacity: 0,
    elevation: 0,
  },
  device: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 13, lineHeight: 18 },
  revoke: { alignSelf: "flex-start", marginTop: 8 },
  revokeText: { fontSize: 13, fontWeight: "700" },
  others: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  othersText: { fontSize: 14, fontWeight: "700" },
});
