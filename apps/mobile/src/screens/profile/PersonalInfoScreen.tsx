import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeHeader } from "../../components/ui/NativeHeader";
import { useProfileData } from "../../hooks/useProfileData";
import type { ProfileStackParamList } from "../../navigation/ProfileStack";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<ProfileStackParamList, "PersonalInfo">;

function Field({
  label,
  value,
  hint,
  onEdit,
  last,
}: {
  label: string;
  value: string;
  hint?: string;
  onEdit?: () => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.field, !last && styles.fieldBorder]}>
      <View style={styles.fieldMain}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Pressable onPress={onEdit} hitSlop={8}>
        <Text style={styles.edit}>Tahrirlash</Text>
      </Pressable>
    </View>
  );
}

export function PersonalInfoScreen({ navigation }: Props) {
  const data = useProfileData();
  const email = data.user?.display_email || data.user?.email || "Ko'rsatilmagan";
  const phone = data.user?.phone?.trim() || "Ko'rsatilmagan";
  const verified = data.user?.email_verified;

  return (
    <View style={styles.root}>
      <NativeHeader title="Shaxsiy ma'lumotlar" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field label="Rasmiy ism" value={data.name} />
        <Field
          label="Email"
          value={verified ? `${email} · Tasdiqlangan` : email}
          hint={verified ? "Email tasdiqlangan." : undefined}
        />
        <Field
          label="Telefon"
          value={phone}
          hint="Telefon raqamini o'zgartirish uchun yordam markaziga murojaat qiling."
        />
        <Field
          label="Manzil"
          value={data.user?.region || "Ko'rsatilmagan"}
          last
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Nima uchun ba'zi ma'lumotlar ko'rinmaydi?</Text>
          <Text style={styles.infoBody}>
            Ba'zi ma'lumotlar faqat tegishli bo'limda ko'rsatiladi. To'liq boshqarish uchun
            maxfiylik sahifasiga o'ting.{" "}
            <Text style={styles.link}>Maxfiylik</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  field: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 16,
  },
  fieldBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  fieldMain: { flex: 1, minWidth: 0 },
  label: { fontSize: 15, fontWeight: "700", color: colors.fg, marginBottom: 4 },
  value: { fontSize: 14, color: colors.fg, lineHeight: 20 },
  hint: { marginTop: 4, fontSize: 12, color: colors.muted, lineHeight: 16 },
  edit: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.fg,
    textDecorationLine: "underline",
    marginTop: 2,
  },
  infoBox: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.bg,
  },
  infoTitle: { fontSize: 14, fontWeight: "700", color: colors.fg, marginBottom: 6 },
  infoBody: { fontSize: 13, lineHeight: 18, color: colors.muted },
  link: {
    color: colors.fg,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
