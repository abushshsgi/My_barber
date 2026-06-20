import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { SettingsEditActions, SettingsFieldRow } from "@/components/settings/SettingsFieldRow";
import { SettingsAddressesPanel } from "@/components/settings/panels/SettingsAddressesPanel";
import { SettingsFamilyPanel } from "@/components/settings/panels/SettingsFamilyPanel";
import { SettingsPrivacyPanel } from "@/components/settings/panels/SettingsPrivacyPanel";
import { SettingsSessionsPanel } from "@/components/settings/panels/SettingsSessionsPanel";
import { SettingsSupportPanel } from "@/components/settings/panels/SettingsSupportPanel";
import type { SettingsPageState } from "@/components/settings/useSettingsPage";
import { SETTINGS_LANGS } from "@/components/settings/useSettingsPage";
import { setLang } from "@/i18n/config";
import type { SettingsEditField } from "@/lib/settings-nav";
import type { SettingsSection } from "@/lib/settings-nav";
import { SETTINGS_SECTION_TITLE_KEYS } from "@/lib/settings-nav";
import { setSession } from "@/lib/auth";
import { sendEmailVerificationCode, verifyEmailCode } from "@/lib/api/email";
import { meQueryKeyFor } from "@/hooks/use-me";
import { getAuthUserId } from "@/lib/auth-user";
import { getUserAccessToken, getUserRefreshToken } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { sanitizeDisplayNameInput, validateDisplayName } from "@/lib/validate-display-name";
import { useCurrency } from "@/hooks/use-currency";
import { fetchCurrencyRates } from "@/lib/api/currency";
import { CURRENCY_VISUAL, LANG_FLAGS } from "@/lib/locale-display";
import { SUPPORTED_CURRENCY_CODES, type CurrencyCode } from "@mybarber/shared/currency";
import type { AppLang } from "@/i18n/config";

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors",
        value ? "bg-foreground" : "bg-surface-2",
      )}
    >
      <span
        className={cn(
          "absolute top-1 h-5 w-5 rounded-full bg-background transition-transform",
          value ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

function LocaleIcon({ emoji, className }: { emoji: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-[1.125rem] leading-none ring-1 ring-border/70",
        className,
      )}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

function SettingsPickerOption({
  selected,
  onClick,
  leading,
  title,
  trailing,
}: {
  selected?: boolean;
  onClick: () => void;
  leading: React.ReactNode;
  title: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-surface/60",
        selected && "bg-surface font-semibold",
      )}
    >
      {leading}
      <span className="min-w-0 flex-1">{title}</span>
      {trailing ? <span className="shrink-0 text-xs text-muted-foreground">{trailing}</span> : null}
    </button>
  );
}

type Props = {
  section: SettingsSection;
  state: SettingsPageState;
  initialEdit?: SettingsEditField;
  addressEditId?: number;
  addressAdd?: boolean;
  manage?: boolean;
  onAddressEditorClose: () => void;
  showBack?: boolean;
};

export function SettingsPanelContent({
  section,
  state,
  initialEdit,
  addressEditId,
  addressAdd,
  manage,
  onAddressEditorClose,
  showBack,
}: Props) {
  const {
    t,
    activeLang,
    user,
    me,
    prefs,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    updatePref,
    resetPrefs,
    handleLogout,
    updateMe,
    setPw,
    changePw,
    notificationItems,
    addresses,
    defaultAddressLabel,
    defaultAddressId,
    langLabel,
    securityMeta,
    familyCount,
    sessionsCount,
  } = state;

  const { currency, setCurrency, ratesUpdatedAt, ratesSource } = useCurrency();
  const { data: currencyRates } = useQuery({
    queryKey: ["currencies", "rates"],
    queryFn: fetchCurrencyRates,
    staleTime: 60 * 60 * 1000,
  });

  const currencyLabel =
    t(`currency.codes.${currency}`, {
      defaultValue: currencyRates?.currencies.find((c) => c.code === currency)?.label ?? currency,
    }) ?? currency;

  const queryClient = useQueryClient();
  const [editEmail, setEditEmail] = useState(initialEdit === "email");
  const [emailStep, setEmailStep] = useState<"input" | "code">("input");
  const [emailDraft, setEmailDraft] = useState("");
  const [emailCode, setEmailCode] = useState("");

  const titleMeta = SETTINGS_SECTION_TITLE_KEYS[section];
  const [editName, setEditName] = useState(initialEdit === "name");
  const [editPassword, setEditPassword] = useState(initialEdit === "password");
  const [editLang, setEditLang] = useState(initialEdit === "language");
  const [editAudience, setEditAudience] = useState(initialEdit === "audience");
  const [editCurrency, setEditCurrency] = useState(false);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.name);

  useEffect(() => {
    setNameDraft(user.name);
  }, [user.name]);

  const nameValidation = useMemo(
    () => validateDisplayName(nameDraft, user.name),
    [nameDraft, user.name],
  );

  useEffect(() => {
    if (changePw.isSuccess || setPw.isSuccess) {
      setEditPassword(false);
      setOldPassword("");
      setNewPassword("");
    }
  }, [changePw.isSuccess, setPw.isSuccess, setNewPassword, setOldPassword]);

  const onOff = (on: boolean) =>
    on
      ? t("settings.row.on", { defaultValue: "Yoqilgan" })
      : t("settings.row.off", { defaultValue: "O'chirilgan" });

  const cancelLabel = t("common.cancel", { defaultValue: "Bekor" });
  const saveLabel = t("common.save", { defaultValue: "Saqlash" });

  const sendEmailCode = useMutation({
    mutationFn: () => sendEmailVerificationCode(emailDraft.trim()),
    onSuccess: (res) => {
      setEmailStep("code");
      toast.success(res.detail);
      if (res.debug_code) {
        toast.message(t("emailVerify.debugCode", { defaultValue: "Dev kod" }), {
          description: res.debug_code,
        });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyEmail = useMutation({
    mutationFn: () => verifyEmailCode(emailCode.trim()),
    onSuccess: (res) => {
      toast.success(t("emailVerify.success", { defaultValue: "Email tasdiqlandi" }));
      const access = getUserAccessToken();
      const refresh = getUserRefreshToken();
      if (access && refresh) setSession(access, refresh, res.user);
      void queryClient.invalidateQueries({ queryKey: meQueryKeyFor(getAuthUserId()) });
      setEditEmail(false);
      setEmailStep("input");
      setEmailDraft("");
      setEmailCode("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const displayEmail = me?.display_email ?? null;
  const emailVerified = me?.email_verified === true;
  const emailMeta = displayEmail
    ? emailVerified
      ? t("settings.fields.emailVerified", { defaultValue: "Tasdiqlangan" })
      : t("settings.fields.emailUnverified", { defaultValue: "Tasdiqlanmagan" })
    : undefined;

  const saveName = () => {
    const checked = validateDisplayName(nameDraft, user.name);
    if (!checked.ok) {
      toast.error(
        t(`settings.errors.${checked.errorKey}`, {
          defaultValue: "Ism noto'g'ri kiritilgan",
        }),
      );
      return;
    }
    const next = checked.value;
    if (next === user.name.trim()) {
      setEditName(false);
      return;
    }
    const parts = next.split(/\s+/);
    updateMe.mutate(
      {
        full_name: next,
        first_name: parts[0] ?? next,
        last_name: parts.slice(1).join(" "),
      },
      {
        onSuccess: () => {
          toast.success(t("settings.saved", { defaultValue: "Saqlandi" }));
          setEditName(false);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const addressEditSearch = defaultAddressId
    ? { section: "addresses" as const, manage: true as const, addressEdit: defaultAddressId }
    : { section: "addresses" as const, manage: true as const, addressAdd: true as const };

  const manageSearch = { section, manage: true as const };
  const showManageDetail =
    manage === true || (section === "addresses" && (addressEditId != null || addressAdd === true));

  const ManageBack = () => (
    <Link
      to="/settings"
      search={{ section }}
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-80"
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
      {t("common.back", { defaultValue: "Orqaga" })}
    </Link>
  );

  return (
    <div>
      {showBack ? (
        <Link
          to="/profile"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-opacity hover:opacity-80 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          {t("common.back", { defaultValue: "Orqaga" })}
        </Link>
      ) : null}

      <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
        {t(titleMeta.titleKey, { defaultValue: titleMeta.defaultTitle })}
      </h2>

      <div className="mt-2">
        {section === "personal" && (
          <>
            <SettingsFieldRow
              label={t("settings.fields.legalName", { defaultValue: "Rasmiy ism" })}
              value={user.name}
              actionLabel={t("settings.actions.edit", { defaultValue: "Tahrirlash" })}
              cancelLabel={cancelLabel}
              expanded={editName}
              onAction={() => {
                if (editName) {
                  setEditName(false);
                  setNameDraft(user.name);
                } else {
                  setNameDraft(user.name);
                  setEditName(true);
                }
              }}
            >
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => setNameDraft(sanitizeDisplayNameInput(e.target.value))}
                autoFocus
                autoComplete="name"
                spellCheck={false}
                maxLength={255}
                aria-invalid={!nameValidation.ok}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground",
                  !nameValidation.ok ? "border-destructive" : "border-border",
                )}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t("settings.errors.nameHint", {
                  defaultValue: "Ism va familiya. Faqat harflar — raqam va belgilar yo'q",
                })}
              </p>
              {!nameValidation.ok ? (
                <p className="mt-1 text-xs text-destructive">
                  {t(`settings.errors.${nameValidation.errorKey}`, {
                    defaultValue: "Ism noto'g'ri kiritilgan",
                  })}
                </p>
              ) : null}
              <div className="mt-3">
                <SettingsEditActions
                  saveLabel={saveLabel}
                  cancelLabel={cancelLabel}
                  saving={updateMe.isPending}
                  saveDisabled={!nameValidation.ok || nameValidation.value === user.name.trim()}
                  onSave={saveName}
                  onCancel={() => {
                    setEditName(false);
                    setNameDraft(user.name);
                  }}
                />
              </div>
            </SettingsFieldRow>
            <SettingsFieldRow
              label={t("settings.fields.email", { defaultValue: "Email" })}
              value={
                displayEmail
                  ? `${displayEmail}${emailMeta ? ` · ${emailMeta}` : ""}`
                  : undefined
              }
              emptyLabel={t("settings.fields.emailNotSet", { defaultValue: "Qo'shilmagan" })}
              hint={
                displayEmail
                  ? emailVerified
                    ? t("settings.fields.emailVerifiedHint", { defaultValue: "Email tasdiqlangan." })
                    : t("settings.fields.emailUnverifiedHint", {
                        defaultValue: "Email tasdiqlanmagan — kod yoki havola orqali tasdiqlang.",
                      })
                  : t("settings.fields.emailHint", {
                      defaultValue: "Email qo'shing — tasdiqlash kodi va havola yuboriladi.",
                    })
              }
              actionLabel={
                displayEmail
                  ? t("settings.actions.edit", { defaultValue: "Tahrirlash" })
                  : t("settings.actions.add", { defaultValue: "Qo'shish" })
              }
              cancelLabel={cancelLabel}
              expanded={editEmail}
              onAction={() => {
                if (editEmail) {
                  setEditEmail(false);
                  setEmailStep("input");
                  setEmailDraft(displayEmail || "");
                  setEmailCode("");
                } else {
                  setEmailDraft(displayEmail || "");
                  setEmailStep("input");
                  setEditEmail(true);
                }
              }}
            >
              {emailStep === "input" ? (
                <div className="space-y-3">
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    autoFocus
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
                  />
                  <SettingsEditActions
                    saveLabel={t("emailVerify.sendCode", { defaultValue: "Kod yuborish" })}
                    cancelLabel={cancelLabel}
                    saving={sendEmailCode.isPending}
                    saveDisabled={!emailDraft.includes("@")}
                    onSave={() => sendEmailCode.mutate()}
                    onCancel={() => {
                      setEditEmail(false);
                      setEmailStep("input");
                      setEmailDraft("");
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {t("emailVerify.codeSent", {
                      defaultValue: "{{email}} manziliga kod yuborildi.",
                      email: emailDraft,
                    })}
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoFocus
                    placeholder="000000"
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm font-medium tracking-[0.3em] outline-none focus:border-foreground"
                  />
                  <SettingsEditActions
                    saveLabel={t("emailVerify.confirm", { defaultValue: "Tasdiqlash" })}
                    cancelLabel={t("emailVerify.changeEmail", { defaultValue: "Emailni o'zgartirish" })}
                    saving={verifyEmail.isPending}
                    saveDisabled={emailCode.length !== 6}
                    onSave={() => verifyEmail.mutate()}
                    onCancel={() => setEmailStep("input")}
                  />
                </div>
              )}
            </SettingsFieldRow>
            <SettingsFieldRow
              label={t("settings.fields.phone", { defaultValue: "Telefon" })}
              value={user.phone || undefined}
              emptyLabel={t("settings.row.notProvided", { defaultValue: "Ko'rsatilmagan" })}
              hint={t("settings.fields.phoneHint")}
              actionLabel={t("settings.actions.edit", { defaultValue: "Tahrirlash" })}
              onAction={() => setPhoneDialogOpen(true)}
            />
            <SettingsFieldRow
              label={t("settings.fields.address", { defaultValue: "Manzil" })}
              value={defaultAddressLabel}
              emptyLabel={t("settings.row.notProvided", { defaultValue: "Ko'rsatilmagan" })}
              actionLabel={
                defaultAddressLabel
                  ? t("settings.actions.edit", { defaultValue: "Tahrirlash" })
                  : t("settings.actions.add", { defaultValue: "Qo'shish" })
              }
              actionTo="/settings"
              actionSearch={addressEditSearch}
            />
          </>
        )}

        {section === "security" && me?.has_password !== undefined && !showManageDetail && (
          <>
            <SettingsFieldRow
              label={t("settings.fields.password", { defaultValue: "Parol" })}
              value={securityMeta}
              actionLabel={
                me.has_password
                  ? t("settings.actions.edit", { defaultValue: "Tahrirlash" })
                  : t("settings.actions.add", { defaultValue: "Qo'shish" })
              }
              cancelLabel={cancelLabel}
              expanded={editPassword}
              onAction={() => {
                if (editPassword) {
                  setEditPassword(false);
                  setOldPassword("");
                  setNewPassword("");
                } else {
                  setEditPassword(true);
                }
              }}
            >
              <div className="space-y-3">
                {me.has_password ? (
                  <input
                    type="password"
                    placeholder={t("settings.currentPassword")}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-foreground"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">{t("settings.passwordNotSet")}</p>
                )}
                <input
                  type="password"
                  placeholder={t("settings.newPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
                <SettingsEditActions
                  saveLabel={me.has_password ? t("settings.changePassword") : t("settings.setPassword")}
                  cancelLabel={cancelLabel}
                  saving={me.has_password ? changePw.isPending : setPw.isPending}
                  saveDisabled={
                    me.has_password
                      ? newPassword.length < 8 || !oldPassword
                      : newPassword.length < 8
                  }
                  onSave={() => (me.has_password ? changePw.mutate() : setPw.mutate())}
                  onCancel={() => {
                    setEditPassword(false);
                    setOldPassword("");
                    setNewPassword("");
                  }}
                />
              </div>
            </SettingsFieldRow>
            <SettingsFieldRow
              label={t("settings.fields.loginMethod", { defaultValue: "Kirish usuli" })}
              value={user.phone}
              hint={t("settings.fields.loginMethodHint", {
                defaultValue: "Hisobingiz telefon raqami orqali tasdiqlangan.",
              })}
            />
            <SettingsFieldRow
              label={t("settings.fields.sessions", { defaultValue: "Faol sessiyalar" })}
              value={t("settings.fields.sessionsMeta", {
                count: sessionsCount,
                defaultValue: "{{count}} ta qurilma",
              })}
              hint={t("settings.fields.sessionsHint", {
                defaultValue: "Hisobingiz ochiq bo'lgan qurilmalarni ko'ring va bekor qiling.",
              })}
              actionLabel={t("settings.actions.manage", { defaultValue: "Boshqarish" })}
              actionTo="/settings"
              actionSearch={manageSearch}
            />
          </>
        )}

        {section === "security" && showManageDetail ? (
          <>
            <ManageBack />
            <SettingsSessionsPanel />
          </>
        ) : null}

        {section === "privacy" && !showManageDetail ? (
          <>
            <SettingsFieldRow
              label={t("settings.fields.dataPrivacy", { defaultValue: "Ma'lumotlar va maxfiylik" })}
              value={t("settings.hubs.privacy.meta", { defaultValue: "Ma'lumot va ruxsatlar" })}
              actionLabel={t("settings.actions.manage", { defaultValue: "Boshqarish" })}
              actionTo="/settings"
              actionSearch={manageSearch}
            />
            <SettingsFieldRow
              label={t("settings.fields.accountData", { defaultValue: "Hisob ma'lumotlari" })}
              hint={t("settings.fields.accountDataHint")}
              actionLabel={t("settings.actions.view", { defaultValue: "Ko'rish" })}
              actionTo="/settings"
              actionSearch={manageSearch}
            />
          </>
        ) : null}

        {section === "privacy" && showManageDetail ? (
          <>
            <ManageBack />
            <SettingsPrivacyPanel />
          </>
        ) : null}

        {section === "notifications" &&
          notificationItems.map((item) => (
            <SettingsFieldRow
              key={item.key}
              label={item.label}
              value={onOff(prefs[item.key])}
              trailing={
                <Toggle
                  value={prefs[item.key]}
                  onChange={(v) => {
                    updatePref(item.key, v);
                    toast.success(t("settings.saved", { defaultValue: "Saqlandi" }));
                  }}
                />
              }
            />
          ))}

        {section === "preferences" && (
          <>
            <SettingsFieldRow
              label={t("settings.language")}
              value={
                <span className="inline-flex items-center gap-2.5">
                  <LocaleIcon emoji={LANG_FLAGS[activeLang as AppLang]} className="h-7 w-7 text-base" />
                  {langLabel}
                </span>
              }
              actionLabel={t("settings.actions.edit", { defaultValue: "Tahrirlash" })}
              cancelLabel={cancelLabel}
              expanded={editLang}
              onAction={() => setEditLang((v) => !v)}
            >
              <div className="divide-y divide-border rounded-lg border border-border">
                {SETTINGS_LANGS.map((lang) => (
                  <SettingsPickerOption
                    key={lang.code}
                    selected={activeLang === lang.code}
                    leading={<LocaleIcon emoji={LANG_FLAGS[lang.code]} />}
                    title={lang.label}
                    onClick={() => {
                      void setLang(lang.code);
                      setEditLang(false);
                      toast.success(t("settings.saved", { defaultValue: "Saqlandi" }));
                    }}
                  />
                ))}
              </div>
            </SettingsFieldRow>
            <SettingsFieldRow
              label={t("currency.title", { defaultValue: "Valyuta" })}
              value={
                <span className="inline-flex items-center gap-2.5">
                  <LocaleIcon emoji={CURRENCY_VISUAL[currency].flag} className="h-7 w-7 text-base" />
                  <span>{currencyLabel}</span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {CURRENCY_VISUAL[currency].symbol}
                  </span>
                </span>
              }
              hint={
                ratesUpdatedAt
                  ? t("currency.ratesHint", {
                      defaultValue:
                        "Narxlar {{currency}} da. Manba: Markaziy bank ({{source}}), kurs sanasi: {{date}}.",
                      currency,
                      source: ratesSource ?? "cbu.uz",
                      date:
                        currencyRates?.rate_date ??
                        new Date(ratesUpdatedAt).toLocaleDateString(),
                    })
                  : t("currency.hint", {
                      defaultValue: "Narxlar tanlangan valyutada ko'rsatiladi (bazada so'm).",
                    })
              }
              actionLabel={t("settings.actions.edit", { defaultValue: "Tahrirlash" })}
              cancelLabel={cancelLabel}
              expanded={editCurrency}
              onAction={() => setEditCurrency((v) => !v)}
            >
              <div className="divide-y divide-border rounded-lg border border-border">
                {SUPPORTED_CURRENCY_CODES.map((code) => {
                  const visual = CURRENCY_VISUAL[code];
                  const label =
                    t(`currency.codes.${code}`, {
                      defaultValue:
                        currencyRates?.currencies.find((c) => c.code === code)?.label ?? code,
                    }) ?? code;
                  return (
                    <SettingsPickerOption
                      key={code}
                      selected={currency === code}
                      leading={<LocaleIcon emoji={visual.flag} />}
                      title={
                        <span className="flex items-center gap-2">
                          <span>{label}</span>
                          <span className="rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                            {visual.symbol}
                          </span>
                        </span>
                      }
                      trailing={code}
                      onClick={() => {
                        setCurrency(code as CurrencyCode);
                        setEditCurrency(false);
                        toast.success(t("settings.saved", { defaultValue: "Saqlandi" }));
                      }}
                    />
                  );
                })}
              </div>
            </SettingsFieldRow>
            <SettingsFieldRow
              label={t("settings.preferredAudience")}
              value={t(`audience.${prefs.preferredAudience}`, { defaultValue: prefs.preferredAudience })}
              actionLabel={t("settings.actions.edit", { defaultValue: "Tahrirlash" })}
              cancelLabel={cancelLabel}
              expanded={editAudience}
              onAction={() => setEditAudience((v) => !v)}
            >
              <AudienceSwitch showProfileHint={false} />
            </SettingsFieldRow>
            <SettingsFieldRow
              label={t("settings.reduceMotion")}
              value={onOff(prefs.reduceMotion)}
              trailing={
                <Toggle
                  value={prefs.reduceMotion}
                  onChange={(v) => {
                    updatePref("reduceMotion", v);
                    toast.success(t("settings.saved", { defaultValue: "Saqlandi" }));
                  }}
                />
              }
            />
          </>
        )}

        {section === "addresses" && !showManageDetail ? (
          <>
            <SettingsFieldRow
              label={t("settings.fields.savedAddresses", { defaultValue: "Saqlangan manzillar" })}
              value={t("settings.hubs.addresses.meta", {
                count: addresses.length,
                defaultValue: "{{count}} ta manzil",
              })}
              actionLabel={t("settings.actions.manage", { defaultValue: "Boshqarish" })}
              actionTo="/settings"
              actionSearch={manageSearch}
            />
            <SettingsFieldRow
              label={t("settings.fields.defaultAddress", { defaultValue: "Asosiy manzil" })}
              value={defaultAddressLabel}
              emptyLabel={t("settings.row.notProvided", { defaultValue: "Ko'rsatilmagan" })}
              actionLabel={
                defaultAddressLabel
                  ? t("settings.actions.edit", { defaultValue: "Tahrirlash" })
                  : t("settings.actions.add", { defaultValue: "Qo'shish" })
              }
              actionTo="/settings"
              actionSearch={addressEditSearch}
            />
          </>
        ) : null}

        {section === "addresses" && showManageDetail ? (
          <>
            <ManageBack />
            <SettingsAddressesPanel
              initialEditId={addressEditId}
              initialAdd={addressAdd}
              onEditorClose={onAddressEditorClose}
            />
          </>
        ) : null}

        {section === "family" && !showManageDetail ? (
          <SettingsFieldRow
            label={t("settings.hubs.family.title", { defaultValue: "Oilaviy profil" })}
            value={
              familyCount > 0
                ? t("settings.hubs.family.metaCount", {
                    count: familyCount,
                    defaultValue: "{{count}} ta a'zo",
                  })
                : t("settings.hubs.family.meta", { defaultValue: "Oila a'zolarini boshqaring" })
            }
            hint={t("settings.hubs.family.desc")}
            actionLabel={t("settings.actions.manage", { defaultValue: "Boshqarish" })}
            actionTo="/settings"
            actionSearch={manageSearch}
          />
        ) : null}

        {section === "family" && showManageDetail ? (
          <>
            <ManageBack />
            <SettingsFamilyPanel />
          </>
        ) : null}

        {section === "help" && !showManageDetail ? (
          <>
            <SettingsFieldRow
              label={t("settings.hubs.help.title", { defaultValue: "Yordam markazi" })}
              value={t("settings.hubs.help.meta", { defaultValue: "Biz bilan bog'laning" })}
              hint={t("settings.hubs.help.desc")}
              actionLabel={t("settings.actions.contact", { defaultValue: "Bog'lanish" })}
              actionTo="/settings"
              actionSearch={manageSearch}
            />
            <SettingsFieldRow
              label={t("settings.fields.faq", { defaultValue: "Ko'p so'raladigan savollar" })}
              actionLabel={t("settings.actions.view", { defaultValue: "Ko'rish" })}
              actionTo="/settings"
              actionSearch={manageSearch}
            />
          </>
        ) : null}

        {section === "help" && showManageDetail ? (
          <>
            <ManageBack />
            <SettingsSupportPanel />
          </>
        ) : null}
      </div>

      {section === "preferences" ? (
        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-8">
          <button
            type="button"
            onClick={() => {
              resetPrefs();
              setCurrency("UZS");
              toast.success(t("settings.resetDone", { defaultValue: "Standart sozlamalar tiklandi" }));
            }}
            className="text-sm font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {t("settings.reset")}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </button>
        </div>
      ) : null}

      {section === "personal" ? (
        <div className="mt-10 rounded-xl border border-border bg-surface/40 p-5">
          <p className="text-sm font-semibold">{t("settings.privacyNote.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settings.privacyNote.body")}{" "}
            <Link
              to="/settings"
              search={{ section: "privacy" }}
              className="font-semibold text-foreground underline underline-offset-2"
            >
              {t("profile.privacy")}
            </Link>
          </p>
        </div>
      ) : null}

      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.fields.phone", { defaultValue: "Telefon" })}</DialogTitle>
            <DialogDescription>{t("settings.fields.phoneHint")}</DialogDescription>
          </DialogHeader>
          {user.phone ? (
            <p className="text-sm font-medium text-foreground">{user.phone}</p>
          ) : null}
          <Link
            to="/settings"
            search={{ section: "help", manage: true }}
            className="inline-flex w-fit rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
            onClick={() => setPhoneDialogOpen(false)}
          >
            {t("settings.actions.contactSupport", { defaultValue: "Yordam markaziga yozish" })}
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}
