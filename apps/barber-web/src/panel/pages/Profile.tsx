"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Mail, Phone, Clock, Sparkles, Building2 } from "lucide-react";
import Link from "next/link";
import { useBarberOnboardingStatus } from "@/hooks/useBarberOnboardingStatus";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

function fmtMoney(price: string): string {
  const n = Number(price);
  if (Number.isFinite(n)) return n.toFixed(0);
  return price;
}

function fmtDuration(mins: number): string {
  if (!Number.isFinite(mins)) return "";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function Profile() {
  const { me, services, workingHours, salons, viewMode, salonView } = useApp();
  const { data: onboarding, isLoading: onboardingLoading } = useBarberOnboardingStatus(Boolean(me));
  const needsSalonConnection = me?.work_mode === "salon" && salons.length === 0;
  const isIndependent = me?.work_mode === "independent";
  const flow = (onboarding?.flow || "").toLowerCase();
  const nextPath = (onboarding?.required_next_path || "").toLowerCase();
  const isOwnerFlow =
    flow === "owner" || flow === "mybarber" || nextPath.startsWith("/salon/create");
  const isEmployeeFlow =
    flow === "employee" || nextPath.startsWith("/salon/join");

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Profil</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Shaxsiy ma’lumotlar, xizmatlar va ish vaqti.
        </p>
      </div>

      {(needsSalonConnection || isIndependent) && (
        <div className="glass-card p-5 border border-border">
          {needsSalonConnection ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {isOwnerFlow ? "Salon hali yaratilmagan" : "Salon ulanmagan"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isOwnerFlow
                    ? "Siz salon owner sifatida ro‘yxatdan o‘tgansiz. Profilni yakunlash uchun salon yarating."
                    : isEmployeeFlow
                      ? "Siz salon xodimi sifatida ro‘yxatdan o‘tgansiz. Davom etish uchun mavjud salonga qo‘shiling (admin taklifi yoki qidiruv orqali)."
                      : "Siz “Salon barber” rejimidasiz, lekin hali salon yaratilmadi yoki siz salonga qo‘shilmagansiz."}
                </p>
              </div>
              {onboardingLoading ? (
                <p className="text-sm text-muted-foreground shrink-0">Tekshirilmoqda…</p>
              ) : isOwnerFlow ? (
                <div className="flex gap-2 shrink-0">
                  <Link
                    href="/salon/create"
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Salon yaratish
                  </Link>
                </div>
              ) : isEmployeeFlow ? (
                <div className="flex gap-2 shrink-0">
                  <Link
                    href="/salon/join"
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Salonga qo‘shilish
                  </Link>
                </div>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <Link
                    href="/salon/join"
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
                  >
                    Salonga qo‘shilish
                  </Link>
                  <Link
                    href="/salon/create"
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    Salon yaratish
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">Siz mustaqil ishlayapsiz</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Hozir “Independent barber” rejimisiz. Agar salon bilan ishlamoqchi bo‘lsangiz, salonga qo‘shiling yoki salon yarating,
                  shundan keyin “Salon view” orqali ko‘rishingiz mumkin bo‘ladi.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href="/salon/join"
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
                >
                  Salonga qo‘shilish
                </Link>
                <Link
                  href="/salon/create"
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
                >
                  Salon yaratish
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col sm:flex-row gap-6">
        <div className="size-24 rounded-2xl bg-muted flex items-center justify-center text-2xl font-bold text-foreground">
          {(me?.full_name || "—").trim().charAt(0) || "—"}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{me?.full_name || "—"}</h2>
            <div className="text-sm text-muted-foreground">
              {me?.work_mode === "salon" ? "Salon barber" : "Independent barber"}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={me?.email || "—"} />
            <Field icon={<Phone className="h-3.5 w-3.5" />} label="Telefon" value={me?.phone || "—"} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Xizmatlar</h2>
            <div className="text-sm text-muted-foreground">
              {services.filter((s) => s.is_active).length} ta faol xizmat
            </div>
          </div>
          <Link
            href="/independent/setup"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Tahrirlash
          </Link>
        </div>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {services.map((s) => (
              <div key={s.id} className="py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground inline-flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {fmtDuration(s.duration_minutes)} · {fmtMoney(s.price)}
                  </div>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-md border",
                    s.is_active ? "bg-foreground text-background border-foreground" : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {s.is_active ? "Faol" : "Faol emas"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Ish vaqti</h2>
        {workingHours.length === 0 ? (
          <p className="text-sm text-muted-foreground">Working hours not configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {WEEKDAYS.map((label, idx) => {
              const wh = workingHours.find((w) => w.weekday === idx);
              const closed = !wh || wh.is_day_off;
              const hours = wh ? `${wh.open_time} – ${wh.close_time}` : "";
              return (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/40"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-sm text-muted-foreground">
                    {closed ? "Dam olish" : hours}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {viewMode === "salon" && salonView && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex items-center gap-4">
          <div className="size-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Ulangan salon</div>
            <div className="font-medium">{salonView.name}</div>
            <div className="text-xs text-muted-foreground truncate">{salonView.address}</div>
          </div>
          <Link
            href="/salon-view"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
          >
            Ko‘rish
          </Link>
        </div>
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <input
        readOnly
        value={value}
        className="mt-1 w-full h-10 px-3 rounded-lg bg-muted text-sm focus:ring-2 focus:ring-ring outline-none"
      />
    </div>
  );
}
