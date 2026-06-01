import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ProfileSubpageCard,
  ProfileSubpageLayout,
} from "@/components/profile/ProfileSubpageLayout";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { setLang } from "@/i18n/config";
import { userProfile } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useAudience, PREFS_KEY, type AudienceFilter } from "@/hooks/use-audience";

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

const defaultPreferredAudience: AudienceFilter =
  userProfile.preferredAudience === "men" || userProfile.preferredAudience === "women"
    ? userProfile.preferredAudience
    : "all";

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
  const { setAudience } = useAudience();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
  }, []);

  const update = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    if (key === "reduceMotion") {
      document.documentElement.classList.toggle("reduce-motion", value);
    }
  };

  const items: { key: keyof Prefs; label: string }[] = [
    { key: "bookingReminders", label: t("settings.bookingReminders") },
    { key: "chatAlerts", label: t("settings.chatAlerts") },
    { key: "reduceMotion", label: t("settings.reduceMotion") },
  ];

  return (
    <ProfileSubpageLayout title={t("settings.title")}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Bildirishnoma
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
          const active = i18n.language === l.code;
          return (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
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

      <button
        type="button"
        onClick={() => {
          setPrefs(DEFAULTS);
          try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(DEFAULTS));
          } catch {
            /* noop */
          }
          setAudience(DEFAULTS.preferredAudience);
          document.documentElement.classList.toggle("reduce-motion", DEFAULTS.reduceMotion);
        }}
        className="mt-6 w-full rounded-2xl border-2 border-border bg-background py-4 text-sm font-bold text-muted-foreground"
      >
        {t("settings.reset")}
      </button>
    </ProfileSubpageLayout>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
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
