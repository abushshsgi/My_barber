import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Clock, Sparkles } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/profile")({
  component: ProfilePage,
});

const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

function ProfilePage() {
  const { profile, services, workingHours, salon, viewMode, toggleService } = useBarberContext();
  const activeServices = services.filter((s) => s.is_active);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-foreground">Profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Shaxsiy ma'lumotlar, xizmatlar va ish vaqti.
        </p>
      </div>

      {/* Identity */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card flex flex-col sm:flex-row gap-6">
        <img src={profile.avatar} alt="" className="size-24 rounded-2xl object-cover ring-1 ring-border" />
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold">{profile.name}</h2>
            <div className="text-sm text-muted-foreground">{profile.title}</div>
          </div>
          <p className="text-sm text-foreground/80">{profile.bio}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field icon={<Mail className="size-3.5" />} label="Email" value={profile.email} />
            <Field icon={<Phone className="size-3.5" />} label="Telefon" value={profile.phone} />
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Xizmatlar</h2>
            <div className="text-sm text-muted-foreground">
              {activeServices.length} ta faol xizmat
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90">
            <Sparkles className="size-3.5" />
            Yangi qo'shish
          </button>
        </div>
        <div className="divide-y divide-border">
          {services.map((s) => (
            <div key={s.id} className="py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{s.name}</div>
                <div className="text-xs text-muted-foreground inline-flex items-center gap-2 mt-0.5">
                  <Clock className="size-3" />
                  {s.duration_min} daqiqa · {formatUZS(s.price)}
                </div>
              </div>
              <button
                onClick={() => toggleService(s.id)}
                className={cn(
                  "h-6 w-11 rounded-full p-0.5 transition-colors",
                  s.is_active ? "bg-foreground" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "block size-5 rounded-full bg-background transition-transform",
                    s.is_active && "translate-x-5",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Working hours */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-heading text-lg font-semibold mb-4">Ish vaqti</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {workingHours.map((wh) => (
            <div
              key={wh.weekday}
              className="flex items-center justify-between px-4 py-3 rounded-lg bg-muted/40"
            >
              <span className="text-sm font-medium">{WEEKDAYS[wh.weekday]}</span>
              <span className="text-sm text-muted-foreground">
                {wh.closed ? "Dam olish" : `${wh.open} – ${wh.close}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Salon link */}
      {viewMode === "salon" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card flex items-center gap-4">
          <img src={salon.cover} alt="" className="size-16 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">A'zo bo'lgan salon</div>
            <div className="font-heading font-medium">{salon.name}</div>
            <div className="text-xs text-muted-foreground truncate">{salon.address}</div>
          </div>
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
