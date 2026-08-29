import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetchUserAddresses, upsertDefaultAddress, type ApiUserAddress } from "../../api/addresses";
import { sendEmailVerificationCode, updateMe, verifyEmailCode } from "../../api/user";
import { useAuth } from "../../auth/AuthContext";
import { useProfileData } from "../../hooks/useProfileData";
import { useAppShell } from "../../lib/AppShellContext";
import { useShellTheme } from "../../lib/useShellTheme";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../utils/responsive";

type EditKind = "name" | "email" | "address" | null;

/** Ism, email, telefon — sozlamalar ichida. */
export function PersonalInfoPanel() {
  const data = useProfileData();
  const { refreshMe } = useAuth();
  const { shell } = useAppShell();
  const pal = useShellTheme();
  const hideAddress = shell === "morph";
  const email = data.user?.display_email || data.user?.email || "";
  const phone = data.user?.phone?.trim() || "";
  const verified = data.user?.email_verified;
  const [address, setAddress] = useState<ApiUserAddress | null>(null);
  const [edit, setEdit] = useState<EditKind>(null);
  const [draft, setDraft] = useState("");
  const [emailStep, setEmailStep] = useState<"input" | "code">("input");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAddress = useCallback(async () => {
    if (hideAddress) return;
    try {
      const rows = await fetchUserAddresses();
      setAddress(rows.find((a) => a.is_default) ?? rows[0] ?? null);
    } catch {
      setAddress(null);
    }
  }, [hideAddress]);

  useEffect(() => {
    void loadAddress();
  }, [loadAddress]);

  const closeEdit = () => {
    setEdit(null);
    setDraft("");
    setEmailStep("input");
    setError(null);
    setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (edit === "name") {
        const name = draft.trim();
        if (name.length < 2) throw new Error("Ism kamida 2 belgi bo'lsin.");
        await updateMe({ full_name: name });
        await refreshMe();
        data.refresh();
      } else if (edit === "email") {
        if (emailStep === "input") {
          const next = draft.trim();
          if (!next.includes("@")) throw new Error("To'g'ri email kiriting.");
          const res = await sendEmailVerificationCode(next);
          setEmailStep("code");
          setDraft(res.debug_code || "");
          setBusy(false);
          return;
        }
        await verifyEmailCode(draft.trim());
        await refreshMe();
        data.refresh();
      } else if (edit === "address") {
        const line = draft.trim();
        if (line.length < 3) throw new Error("Manzilni kiriting.");
        const region = data.user?.region || "TOSHKENT_SH";
        await upsertDefaultAddress({
          id: address?.id,
          address_line: line,
          region,
        });
        await loadAddress();
      }
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+:\s*/, "") : "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const open = (kind: EditKind, value: string) => {
    setEdit(kind);
    setDraft(value);
    setEmailStep("input");
    setError(null);
  };

  const addressValue =
    address?.address_line?.trim() || data.user?.region || "Ko'rsatilmagan";

  return (
    <View>
      <Field
        pal={pal}
        label="Rasmiy ism"
        value={data.name}
        onEdit={() => open("name", data.name === "Mehmon" ? "" : data.name)}
      />
      <Field
        pal={pal}
        label="Email"
        value={
          email
            ? verified
              ? `${email} · Tasdiqlangan`
              : email
            : "Ko'rsatilmagan"
        }
        hint={verified ? "Email tasdiqlangan." : undefined}
        onEdit={() => open("email", email.includes("@phone.") ? "" : email)}
      />
      <Field
        pal={pal}
        label="Telefon"
        value={phone || "Ko'rsatilmagan"}
        hint="Telefon raqamini o'zgartirish uchun yordam markaziga murojaat qiling."
        last={hideAddress}
      />
      {hideAddress ? null : (
        <Field
          pal={pal}
          label="Manzil"
          value={addressValue}
          onEdit={() => open("address", address?.address_line || "")}
          last
        />
      )}

      <View style={[styles.infoBox, { borderColor: pal.border, backgroundColor: pal.surface }]}>
        <Text style={[styles.infoTitle, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
          Nima uchun ba'zi ma'lumotlar ko'rinmaydi?
        </Text>
        <Text style={[styles.infoBody, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
          Ba'zi ma'lumotlar faqat tegishli bo'limda ko'rsatiladi. Morf AI da manzil yashirinadi,
          MySaloon da esa bron uchun ishlatiladi.
        </Text>
      </View>

      <Modal visible={edit != null} transparent animationType="fade" onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={styles.scrim} onPress={busy ? undefined : closeEdit} />
          <View style={[styles.sheet, { backgroundColor: pal.card }]}>
            <Text style={[styles.sheetTitle, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
              {edit === "name"
                ? "Ismni tahrirlash"
                : edit === "email"
                  ? emailStep === "code"
                    ? "Tasdiq kodi"
                    : "Emailni tahrirlash"
                  : "Manzilni tahrirlash"}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              placeholder={
                edit === "email" && emailStep === "code" ? "4 raqamli kod" : "Yozing"
              }
              placeholderTextColor={pal.muted}
              keyboardType={edit === "email" && emailStep === "code" ? "number-pad" : "default"}
              style={[
                styles.input,
                {
                  color: pal.fg,
                  backgroundColor: pal.iconTile,
                  borderColor: pal.border,
                  fontFamily: pal.font.fontFamily,
                },
              ]}
            />
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <View style={styles.sheetRow}>
              <Pressable onPress={closeEdit} disabled={busy} style={styles.sheetBtn}>
                <Text style={[styles.sheetBtnText, { color: pal.muted }]}>Bekor</Text>
              </Pressable>
              <Pressable
                onPress={() => void save()}
                disabled={busy}
                style={[styles.sheetBtn, styles.sheetBtnPrimary, { backgroundColor: pal.fg }]}
              >
                {busy ? (
                  <ActivityIndicator color={pal.bg} />
                ) : (
                  <Text style={[styles.sheetBtnText, { color: pal.bg }]}>
                    {edit === "email" && emailStep === "input" ? "Kod yuborish" : "Saqlash"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({
  pal,
  label,
  value,
  hint,
  onEdit,
  last,
}: {
  pal: ReturnType<typeof useShellTheme>;
  label: string;
  value: string;
  hint?: string;
  onEdit?: () => void;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.field,
        !last && styles.fieldBorder,
        !last && { borderBottomColor: pal.border },
      ]}
    >
      <View style={styles.fieldMain}>
        <Text style={[styles.label, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
          {label}
        </Text>
        <Text style={[styles.value, { color: pal.fg, fontFamily: pal.font.fontFamily }]}>
          {value}
        </Text>
        {hint ? (
          <Text style={[styles.hint, { color: pal.muted, fontFamily: pal.font.fontFamily }]}>
            {hint}
          </Text>
        ) : null}
      </View>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={8}>
          <Text style={[styles.edit, { color: pal.accent, fontFamily: pal.font.fontFamily }]}>
            Tahrirlash
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: moderateScale(16),
    paddingVertical: verticalScale(16),
  },
  fieldBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  fieldMain: { flex: 1, minWidth: 0 },
  label: { fontSize: fontSize(15), fontWeight: "700", marginBottom: verticalScale(4) },
  value: { fontSize: fontSize(14), lineHeight: fontSize(20) },
  hint: { marginTop: verticalScale(4), fontSize: fontSize(12), lineHeight: fontSize(16) },
  edit: { fontSize: fontSize(13), fontWeight: "600", marginTop: verticalScale(2) },
  infoBox: {
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderRadius: moderateScale(14),
    padding: moderateScale(14),
  },
  infoTitle: { fontSize: fontSize(14), fontWeight: "700", marginBottom: verticalScale(6) },
  infoBody: { fontSize: fontSize(13), lineHeight: fontSize(18) },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    padding: moderateScale(18),
    paddingBottom: verticalScale(28),
    gap: moderateScale(12),
  },
  sheetTitle: { fontSize: fontSize(17), fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    fontSize: fontSize(15),
  },
  err: { color: "#FF3B30", fontSize: fontSize(13) },
  sheetRow: { flexDirection: "row", gap: moderateScale(10), justifyContent: "flex-end" },
  sheetBtn: { paddingHorizontal: scale(14), paddingVertical: verticalScale(10), borderRadius: moderateScale(12) },
  sheetBtnPrimary: { minWidth: scale(120), alignItems: "center" },
  sheetBtnText: { fontSize: fontSize(15), fontWeight: "700" },
});
