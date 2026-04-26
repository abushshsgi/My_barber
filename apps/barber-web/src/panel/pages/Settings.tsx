"use client";

import { Bell, Globe, Moon, ShieldCheck, Trash2, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "@/adminhub-ui/barber/primitives";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type LocalSettings = {
  notifications_email: boolean;
  notifications_push: boolean;
  notifications_sms: boolean;
  auto_accept: boolean;
};

const LS_KEY = "barber_settings_local_v1";

function readSettings(): LocalSettings {
  if (typeof window === "undefined") {
    return { notifications_email: true, notifications_push: true, notifications_sms: false, auto_accept: false };
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { notifications_email: true, notifications_push: true, notifications_sms: false, auto_accept: false };
    const j = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      notifications_email: Boolean(j.notifications_email ?? true),
      notifications_push: Boolean(j.notifications_push ?? true),
      notifications_sms: Boolean(j.notifications_sms ?? false),
      auto_accept: Boolean(j.auto_accept ?? false),
    };
  } catch {
    return { notifications_email: true, notifications_push: true, notifications_sms: false, auto_accept: false };
  }
}

function writeSettings(s: LocalSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export default function SettingsPage() {
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState<LocalSettings>(() => readSettings());

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  const currentTheme = useMemo(() => (theme === "dark" ? "dark" : "light"), [theme]);

  const toggle = (key: keyof LocalSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Sozlamalar" description="Akkaunt, bildirishnomalar va ko‘rinish." />

      <SectionCard title="Bildirishnomalar" description="Qaysi kanallar orqali xabar olishni tanlang">
        <div className="space-y-1">
          <ToggleRow
            icon={<Bell className="h-4 w-4" />}
            label="Email xabarlar"
            desc="Yangi bron va sharhlar uchun"
            checked={settings.notifications_email}
            onChange={() => toggle("notifications_email")}
          />
          <ToggleRow
            icon={<Bell className="h-4 w-4" />}
            label="Push bildirishnomalar"
            desc="Brauzer orqali"
            checked={settings.notifications_push}
            onChange={() => toggle("notifications_push")}
          />
          <ToggleRow
            icon={<Bell className="h-4 w-4" />}
            label="SMS"
            desc="Faqat muhim hodisalar uchun"
            checked={settings.notifications_sms}
            onChange={() => toggle("notifications_sms")}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Eslatma: hozircha bu sozlamalar lokal saqlanadi. Backendga persist qilish uchun API kerak bo‘ladi.
        </p>
      </SectionCard>

      <SectionCard title="Bron sozlamalari">
        <ToggleRow
          icon={<Zap className="h-4 w-4" />}
          label="Avtomatik qabul"
          desc="Yangi bronlar avtomatik tasdiqlanadi (UI-only)"
          checked={settings.auto_accept}
          onChange={() => toggle("auto_accept")}
        />
      </SectionCard>

      <SectionCard title="Til va ko‘rinish">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2 inline-flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Interfeys tili
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["uz", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                    locale === l ? "bg-foreground text-background border-foreground" : "bg-card border-border hover:bg-muted"
                  )}
                >
                  {l === "uz" ? "O'zbekcha" : l === "ru" ? "Русский" : "English"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2 inline-flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Tema
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                    currentTheme === t
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border hover:bg-muted"
                  )}
                >
                  {t === "light" ? "Yorug'" : "Tungi"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Xavfsizlik">
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
            onClick={() => toast.info("Parol o‘zgartirish: API kerak")}
          >
            <ShieldCheck className="h-4 w-4" />
            <div className="flex-1">
              <div className="text-sm font-medium">Parolni o‘zgartirish</div>
              <div className="text-xs text-muted-foreground">Backend endpoint kerak</div>
            </div>
          </button>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-left"
            onClick={() => toast.info("2FA: API kerak")}
          >
            <ShieldCheck className="h-4 w-4" />
            <div className="flex-1">
              <div className="text-sm font-medium">Ikki bosqichli autentifikatsiya</div>
              <div className="text-xs text-muted-foreground">Hozircha yo‘q</div>
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Xavfli zona">
        <button
          type="button"
          onClick={() => toast.error("Akkauntni o‘chirish: support/API kerak")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium"
        >
          <Trash2 className="h-4 w-4" />
          Akkauntni o‘chirish
        </button>
      </SectionCard>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={onChange}
        className={cn("h-6 w-11 rounded-full p-0.5 transition-colors", checked ? "bg-foreground" : "bg-muted")}
      >
        <span className={cn("block size-5 rounded-full bg-background transition-transform", checked && "translate-x-5")} />
      </button>
    </div>
  );
}

