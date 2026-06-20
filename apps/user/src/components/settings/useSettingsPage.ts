import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AccountHubTile } from "@/components/desktop/profile/ProfileAccountHubGrid";
import { useAudience, getPrefsStorageKey, type AudienceFilter } from "@/hooks/use-audience";
import { useUserAddresses } from "@/hooks/use-addresses";
import { changePassword, setPassword } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { meQueryKeyFor, useDisplayUser, useMe, useUpdateMe } from "@/hooks/use-me";
import { getAuthUserId } from "@/lib/auth-user";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import type { AppLang } from "@/i18n/config";

export interface SettingsPrefs {
  bookingReminders: boolean;
  chatAlerts: boolean;
  reduceMotion: boolean;
  preferredAudience: AudienceFilter;
}

export type SettingsBoolPref = "bookingReminders" | "chatAlerts" | "reduceMotion";

const defaultPreferredAudience: AudienceFilter = "all";

export const SETTINGS_DEFAULTS: SettingsPrefs = {
  bookingReminders: true,
  chatAlerts: true,
  reduceMotion: false,
  preferredAudience: defaultPreferredAudience,
};

export const SETTINGS_LANGS = [
  { code: "uz" as const, label: "O'zbek" },
  { code: "ru" as const, label: "Русский" },
  { code: "en" as const, label: "English" },
];

export function useSettingsPage() {
  const { t, i18n } = useTranslation();
  const activeLang = (i18n.resolvedLanguage || i18n.language || "uz").split("-")[0] as AppLang;
  const { setAudience } = useAudience();
  const queryClient = useQueryClient();
  const user = useDisplayUser();
  const { data: me } = useMe();
  const authUserId = me?.id ?? getAuthUserId();
  const updateMe = useUpdateMe();
  const { handleLogout } = useProfileScreen();
  const { data: addresses = [] } = useUserAddresses();
  const [prefs, setPrefs] = useState<SettingsPrefs>(SETTINGS_DEFAULTS);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const setPw = useMutation({
    mutationFn: () => setPassword(newPassword),
    onSuccess: (res) => {
      toast.success(t("settings.passwordSaved"));
      setNewPassword("");
      void queryClient.invalidateQueries({ queryKey: meQueryKeyFor(getAuthUserId()) });
      if (res.user) {
        const access = localStorage.getItem("mybarber_user_access");
        const refresh = localStorage.getItem("mybarber_user_refresh");
        if (access && refresh) setSession(access, refresh, res.user);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePw = useMutation({
    mutationFn: () => changePassword(oldPassword, newPassword),
    onSuccess: (res) => {
      toast.success(t("settings.passwordChanged"));
      setOldPassword("");
      setNewPassword("");
      void queryClient.invalidateQueries({ queryKey: meQueryKeyFor(getAuthUserId()) });
      if (res.user) {
        const access = localStorage.getItem("mybarber_user_access");
        const refresh = localStorage.getItem("mybarber_user_refresh");
        if (access && refresh) setSession(access, refresh, res.user);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(getPrefsStorageKey());
      if (raw) setPrefs({ ...SETTINGS_DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, [authUserId]);

  const updatePref = (key: SettingsBoolPref, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(getPrefsStorageKey(), JSON.stringify(next));
    } catch {}
    if (key === "reduceMotion") {
      document.documentElement.classList.toggle("reduce-motion", value);
    }
  };

  const resetPrefs = () => {
    setPrefs(SETTINGS_DEFAULTS);
    try {
      localStorage.setItem(getPrefsStorageKey(), JSON.stringify(SETTINGS_DEFAULTS));
    } catch {}
    setAudience(SETTINGS_DEFAULTS.preferredAudience);
    document.documentElement.classList.toggle("reduce-motion", SETTINGS_DEFAULTS.reduceMotion);
  };

  const notificationItems: { key: SettingsBoolPref; label: string }[] = [
    { key: "bookingReminders", label: t("settings.bookingReminders") },
    { key: "chatAlerts", label: t("settings.chatAlerts") },
    { key: "reduceMotion", label: t("settings.reduceMotion") },
  ];

  const langLabel = SETTINGS_LANGS.find((l) => l.code === activeLang)?.label ?? activeLang;
  const securityMeta =
    me?.has_password === true
      ? t("settings.hubs.security.metaSet", { defaultValue: "Parol o'rnatilgan" })
      : me?.has_password === false
        ? t("settings.hubs.security.metaSms", { defaultValue: "SMS orqali kirish" })
        : t("settings.hubs.security.metaDefault", { defaultValue: "Kirish usuli" });

  const hubTiles: AccountHubTile[] = [
    {
      title: t("settings.hubs.personal.title", { defaultValue: "Shaxsiy ma'lumotlar" }),
      description: t("settings.hubs.personal.desc", {
        defaultValue: "Ism, telefon va profil ma'lumotlari.",
      }),
      to: "/settings",
      hash: "personal",
      meta: user.name,
    },
    {
      title: t("settings.hubs.security.title", { defaultValue: "Kirish va xavfsizlik" }),
      description: t("settings.hubs.security.desc", {
        defaultValue: "Parolni yangilang va hisobingizni himoya qiling.",
      }),
      to: "/settings",
      hash: "security",
      meta: securityMeta,
    },
    {
      title: t("settings.hubs.addresses.title", { defaultValue: "Manzillar" }),
      description: t("settings.hubs.addresses.desc", {
        defaultValue: "Uy, ish va boshqa saqlangan manzillar.",
      }),
      to: "/addresses",
      meta: t("settings.hubs.addresses.meta", {
        count: addresses.length,
        defaultValue: "{{count}} ta manzil",
      }),
    },
    {
      title: t("settings.hubs.family.title", { defaultValue: "Oilaviy profil" }),
      description: t("settings.hubs.family.desc", {
        defaultValue: "Oila a'zolari uchun tez bron qilish.",
      }),
      to: "/family",
      meta: t("settings.hubs.family.meta", { defaultValue: "Oila a'zolarini boshqaring" }),
    },
    {
      title: t("settings.hubs.notifications.title", { defaultValue: "Bildirishnoma afzalliklari" }),
      description: t("settings.hubs.notifications.desc", {
        defaultValue: "Eslatmalar va chat xabarlari.",
      }),
      to: "/settings",
      hash: "notifications",
      meta: prefs.bookingReminders
        ? t("settings.hubs.notifications.metaOn", { defaultValue: "Eslatmalar yoqilgan" })
        : t("settings.hubs.notifications.metaOff", { defaultValue: "Eslatmalar o'chirilgan" }),
    },
    {
      title: t("settings.hubs.preferences.title", { defaultValue: "Til va afzalliklar" }),
      description: t("settings.hubs.preferences.desc", {
        defaultValue: "Til, salon turi va ko'rinish sozlamalari.",
      }),
      to: "/settings",
      hash: "preferences",
      meta: langLabel,
    },
    {
      title: t("settings.hubs.privacy.title", { defaultValue: "Maxfiylik" }),
      description: t("settings.hubs.privacy.desc", {
        defaultValue: "Ma'lumotlaringizni boshqaring va yuklab oling.",
      }),
      to: "/privacy",
      meta: t("settings.hubs.privacy.meta", { defaultValue: "Ma'lumot va ruxsatlar" }),
    },
    {
      title: t("settings.hubs.help.title", { defaultValue: "Yordam markazi" }),
      description: t("settings.hubs.help.desc", {
        defaultValue: "Savollar, shikoyatlar va aloqa.",
      }),
      to: "/support",
      meta: t("settings.hubs.help.meta", { defaultValue: "Biz bilan bog'laning" }),
    },
  ];

  return {
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
    hubTiles,
  };
}

export type SettingsPageState = ReturnType<typeof useSettingsPage>;
