import { createFileRoute } from "@tanstack/react-router";
import { Bell, Globe, Moon, ShieldCheck, Trash2, Zap } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { PageHeader, SectionCard } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings } = useBarberContext();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <PageHeader title="Sozlamalar" description="Akkaunt, bildirishnomalar va xavfsizlik." />

      <SectionCard title="Bildirishnomalar" description="Qaysi kanallar orqali xabar olishni tanlang">
        <div className="space-y-1">
          <Toggle
            icon={<Bell className="size-4" />}
            label="Email xabarlar"
            desc="Yangi bron va sharhlar uchun"
            checked={settings.notifications_email}
            onChange={(v) => updateSettings({ notifications_email: v })}
          />
          <Toggle
            icon={<Bell className="size-4" />}
            label="Push bildirishnomalar"
            desc="Brauzer va ilova orqali"
            checked={settings.notifications_push}
            onChange={(v) => updateSettings({ notifications_push: v })}
          />
          <Toggle
            icon={<Bell className="size-4" />}
            label="SMS"
            desc="Faqat muhim hodisalar uchun"
            checked={settings.notifications_sms}
            onChange={(v) => updateSettings({ notifications_sms: v })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Bron sozlamalari">
        <Toggle
          icon={<Zap className="size-4" />}
          label="Avtomatik qabul"
          desc="Yangi bronlar avtomatik tasdiqlanadi"
          checked={settings.auto_accept}
          onChange={(v) => updateSettings({ auto_accept: v })}
        />
      </SectionCard>

      <SectionCard title="Til va ko'rinish">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2 inline-flex items-center gap-2">
              <Globe className="size-4" />
              Interfeys tili
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["uz", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => updateSettings({ language: l })}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                    settings.language === l
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border hover:bg-muted",
                  )}
                >
                  {l === "uz" ? "O'zbekcha" : l === "ru" ? "Русский" : "English"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2 inline-flex items-center gap-2">
              <Moon className="size-4" />
              Tema
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                    settings.theme === t
                      ? "bg-foreground text-background border-foreground"
                      : "bg-card border-border hover:bg-muted",
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
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-left">
            <ShieldCheck className="size-4" />
            <div className="flex-1">
              <div className="text-sm font-medium">Parolni o'zgartirish</div>
              <div className="text-xs text-muted-foreground">So'nggi yangilangan: 2 oy oldin</div>
            </div>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-left">
            <ShieldCheck className="size-4" />
            <div className="flex-1">
              <div className="text-sm font-medium">Ikki bosqichli autentifikatsiya</div>
              <div className="text-xs text-muted-foreground">Yoqilmagan</div>
            </div>
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Xavfli zona">
        <button
          onClick={() => toast.error("Bu amalni bajarish uchun support bilan bog'laning")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 text-sm font-medium"
        >
          <Trash2 className="size-4" />
          Akkauntni o'chirish
        </button>
      </SectionCard>
    </div>
  );
}

function Toggle({
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
  onChange: (v: boolean) => void;
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
        onClick={() => onChange(!checked)}
        className={cn(
          "h-6 w-11 rounded-full p-0.5 transition-colors",
          checked ? "bg-foreground" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "block size-5 rounded-full bg-background transition-transform",
            checked && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
