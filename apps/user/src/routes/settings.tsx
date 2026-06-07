import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { setLang, type AppLang } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { useAudience, PREFS_KEY, type AudienceFilter } from "@/hooks/use-audience";
import { changePassword, setPassword } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { meQueryKey, useDisplayUser, useMe, useUpdateMe } from "@/hooks/use-me";
import { useProfileScreen } from "@/components/profile/useProfileScreen";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Sozlamalar — mysaloon.uz" }] }),
  component: Settings,
});

interface Prefs {
  bookingReminders: boolean;
  chatAlerts: boolean;
  reduceMotion: boolean;
  preferredAudience: AudienceFilter;
}

type BoolPref = "bookingReminders" | "chatAlerts" | "reduceMotion";

const defaultPreferredAudience: AudienceFilter = "all";

const DEFAULTS: Prefs = {
  bookingReminders: true,
  chatAlerts: true,
  reduceMotion: false,
  preferredAudience: defaultPreferredAudience,
};

const LANGS = [
  { code: "uz" as const, label: "O'zbek" },
  { code: "ru" as const, label: "Русский" },
  { code: "en" as const, label: "English" },
];

function Settings() {
  const { t, i18n } = useTranslation();
  const activeLang = (i18n.resolvedLanguage || i18n.language || "uz").split("-")[0] as AppLang;
  const { setAudience } = useAudience();
  const queryClient = useQueryClient();
  const user = useDisplayUser();
  const { data: me } = useMe();
  const updateMe = useUpdateMe();
  const { handleLogout } = useProfileScreen();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const setPw = useMutation({
    mutationFn: () => setPassword(newPassword),
    onSuccess: (res) => {
      toast.success(t("settings.passwordSaved"));
      setNewPassword("");
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
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
      void queryClient.invalidateQueries({ queryKey: meQueryKey });
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
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const update = (key: BoolPref, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {}
    if (key === "reduceMotion") {
      document.documentElement.classList.toggle("reduce-motion", value);
    }
  };

  const items: { key: BoolPref; label: string }[] = [
    { key: "bookingReminders", label: t("settings.bookingReminders") },
    { key: "chatAlerts", label: t("settings.chatAlerts") },
    { key: "reduceMotion", label: t("settings.reduceMotion") },
  ];

  return (
    <ProfileSubpageLayout title={t("settings.title")}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Profil
      </p>
      <ProfileSubpageCard className="space-y-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Ism
          </span>
          <input
            type="text"
            defaultValue={user.name}
            key={user.name}
            onBlur={(e) => {
              const next = e.target.value.trim();
              if (next && next !== user.name) {
                updateMe.mutate({ full_name: next });
              }
            }}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold outline-none focus:border-foreground"
          />
        </label>
        {user.phone ? (
          <p className="text-xs text-muted-foreground">{user.phone}</p>
        ) : null}
      </ProfileSubpageCard>

      <p className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t("settings.notificationsSection")}
      </p>
      <ProfileSubpageCard className="overflow-hidden p-0">
        {items.map((item, i) => (
          <div
            key={item.key}
            className={
              "flex items-center justify-between gap-4 px-4 py-4" +
              (i < items.length - 1 ? " border-b border-border" : "")
            }
          >
            <span className="text-sm font-bold">{item.label}</span>
            <Toggle value={prefs[item.key]} onChange={(v) => update(item.key, v)} />
          </div>
        ))}
      </ProfileSubpageCard>

      <p className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t("settings.preferredAudience")}
      </p>
      <ProfileSubpageCard>
        <AudienceSwitch showProfileHint={false} />
      </ProfileSubpageCard>

      <p className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t("settings.language")}
      </p>
      <ProfileSubpageCard className="overflow-hidden p-0">
        {LANGS.map((l, i) => {
          const active = activeLang === l.code;
          return (
            <button
              key={l.code}
              onClick={() => void setLang(l.code)}
              className={
                "flex w-full items-center justify-between gap-4 px-4 py-4 text-left" +
                (i < LANGS.length - 1 ? " border-b border-border" : "")
              }
            >
              <span className="text-sm font-bold">{l.label}</span>
              <div
                className={cn(
                  "h-5 w-5 rounded-full border-2",
                  active ? "border-foreground bg-foreground" : "border-border",
                )}
              >
                {active && <div className="m-1 h-1.5 w-1.5 rounded-full bg-background" />}
              </div>
            </button>
          );
        })}
      </ProfileSubpageCard>

      {me?.has_password !== undefined && (
        <>
      <p className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {t("settings.passwordSection")}
      </p>
      <ProfileSubpageCard className="space-y-3">
        {me.has_password === true ? (
          <>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("settings.currentPassword")}
              </span>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold outline-none focus:border-foreground"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("settings.newPassword")}
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold outline-none focus:border-foreground"
              />
            </label>
            <button
              type="button"
              disabled={changePw.isPending || newPassword.length < 8 || !oldPassword}
              onClick={() => changePw.mutate()}
              className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background disabled:opacity-60"
            >
              {t("settings.changePassword")}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{t("settings.passwordNotSet")}</p>
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("settings.newPassword")}
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-bold outline-none focus:border-foreground"
              />
            </label>
            <button
              type="button"
              disabled={setPw.isPending || newPassword.length < 8}
              onClick={() => setPw.mutate()}
              className="w-full rounded-xl bg-foreground py-3 text-sm font-bold text-background disabled:opacity-60"
            >
              {t("settings.setPassword")}
            </button>
          </>
        )}
      </ProfileSubpageCard>
        </>
      )}

      <button
        type="button"
        onClick={() => {
          setPrefs(DEFAULTS);
          try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(DEFAULTS));
          } catch {}
          setAudience(DEFAULTS.preferredAudience);
          document.documentElement.classList.toggle("reduce-motion", DEFAULTS.reduceMotion);
        }}
        className="mt-6 w-full rounded-2xl border-2 border-border bg-background py-4 text-sm font-bold text-muted-foreground"
      >
        {t("settings.reset")}
      </button>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background py-4 text-sm font-bold text-muted-foreground transition-colors duration-200 active:bg-surface"
      >
        <LogOut className="h-4 w-4" strokeWidth={2.2} />
        {t("common.logout")}
      </button>
    </ProfileSubpageLayout>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors",
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
