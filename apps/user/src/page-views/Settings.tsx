"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Moon, RotateCcw, Settings as SettingsIcon, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { Button } from "@/components/ui/button";
import { clearTokens } from "@/lib/api";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import {
  applyReduceMotion,
  DEFAULT_USER_PREFERENCES,
  readUserPreferences,
  writeUserPreferences,
  type UserPreferences,
} from "../lib/user-preferences";

function ToggleRow({
  title,
  body,
  icon: Icon,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-3xl border border-border bg-surface p-4 text-left shadow-soft transition active:scale-[0.99]"
      aria-pressed={checked}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{body}</span>
      </span>
      <span
        className={[
          "relative h-7 w-12 shrink-0 rounded-full transition",
          checked ? "bg-foreground" : "bg-muted",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-5 w-5 rounded-full bg-background shadow-sm transition",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

function Settings() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);

  useEffect(() => {
    setPrefs(readUserPreferences());
  }, []);

  const update = (next: UserPreferences) => {
    setPrefs(next);
    writeUserPreferences(next);
    applyReduceMotion(next.reduceMotion);
    toast.success("Sozlama saqlandi");
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="px-5 pt-safe">
        <div className="pt-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-foreground text-background shadow-card">
            <SettingsIcon className="h-6 w-6" />
          </span>
          <p className="label-eyebrow mt-5">Ilova sozlamalari</p>
          <h1 className="font-display mt-1 text-[26px] font-semibold tracking-tight text-foreground">
            Tez va aniq boshqaruv
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Bu sozlamalar qurilmada saqlanadi va foydalanuvchi tajribasini moslashtiradi.
          </p>
        </div>
      </header>

      <main className="space-y-3 px-5 pt-5">
        <ToggleRow
          title="Booking eslatmalari"
          body="Bandlar va statuslar uchun notification badge va web-socket yangilanishlari faol qoladi."
          icon={Bell}
          checked={prefs.bookingReminders}
          onChange={(bookingReminders) => update({ ...prefs, bookingReminders })}
        />
        <ToggleRow
          title="Chat xabarlari"
          body="Chat ro'yxati va notificationlar sahifasida yangi xabarlarni ko'rsatish."
          icon={Shield}
          checked={prefs.chatAlerts}
          onChange={(chatAlerts) => update({ ...prefs, chatAlerts })}
        />
        <ToggleRow
          title="Harakatlarni kamaytirish"
          body="Animatsiyalarni kamroq ko'rishni xohlasangiz yoqing."
          icon={Moon}
          checked={prefs.reduceMotion}
          onChange={(reduceMotion) => update({ ...prefs, reduceMotion })}
        />

        <div className="grid grid-cols-2 gap-3 pt-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-2xl"
            onClick={() => update(DEFAULT_USER_PREFERENCES)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              clearTokens();
              router.push("/auth");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Chiqish
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function SettingsWithAuth() {
  return (
    <AuthGate title="Sozlamalar uchun kiring" description="Shaxsiy sozlamalar va sessiyani boshqarish uchun akkaunt kerak.">
      <Settings />
    </AuthGate>
  );
}
