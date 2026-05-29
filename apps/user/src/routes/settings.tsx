import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { setLang } from "@/i18n/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Sozlamalar — mysaloon.uz" }] }),
  component: Settings,
});

const STORAGE_KEY = "mysaloon.prefs";

interface Prefs {
  bookingReminders: boolean;
  chatAlerts: boolean;
  reduceMotion: boolean;
}

const DEFAULTS: Prefs = {
  bookingReminders: true,
  chatAlerts: true,
  reduceMotion: false,
};

const LANGS = [
  { code: "uz" as const, label: "O'zbek" },
  { code: "ru" as const, label: "Русский" },
  { code: "en" as const, label: "English" },
];

function Settings() {
  const { t, i18n } = useTranslation();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const update = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
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
    <div className="pb-8">
      <PageHeader showBack title={t("settings.title")} />

      <div className="px-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Bildirishnoma
        </p>
        <div className="overflow-hidden rounded-2xl border border-border">
          {items.map((item, i) => (
            <div
              key={item.key}
              className={
                "flex items-center justify-between gap-4 px-4 py-4" +
                (i < items.length - 1 ? " border-b border-border" : "")
              }
            >
              <span className="text-sm font-bold">{item.label}</span>
              <Toggle
                value={prefs[item.key]}
                onChange={(v) => update(item.key, v)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 px-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {t("settings.language")}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border">
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
                  {active && (
                    <div className="m-1 h-1.5 w-1.5 rounded-full bg-background" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 px-5">
        <button
          onClick={() => {
            setPrefs(DEFAULTS);
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {}
          }}
          className="w-full rounded-2xl border-2 border-border py-4 text-sm font-bold text-muted-foreground"
        >
          {t("settings.reset")}
        </button>
      </div>
    </div>
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
