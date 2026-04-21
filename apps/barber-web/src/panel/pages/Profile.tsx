"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { Clock, Scissors, User } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

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
  const { me, services, workingHours } = useApp();

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Your barber profile</p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{me?.full_name || "—"}</h2>
            <p className="text-sm text-muted-foreground">{me?.work_mode === "salon" ? "Salon barber" : "Independent barber"}</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</label>
            <input
              value={me?.full_name || ""}
              readOnly
              className="w-full mt-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</label>
            <input
              value={me?.phone || ""}
              readOnly
              className="w-full mt-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Email</label>
            <input
              value={me?.email || ""}
              readOnly
              className="w-full mt-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2"><Scissors className="h-4 w-4" /> Services</h3>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services yet.</p>
        ) : (
          <div className="space-y-2">
            {services
              .filter((s) => s.is_active)
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium">{s.name}</span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{fmtDuration(s.duration_minutes)}</span>
                    <span className="font-medium text-foreground">{fmtMoney(s.price)}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> Working Hours</h3>
        {workingHours.length === 0 ? (
          <p className="text-sm text-muted-foreground">Working hours not configured yet.</p>
        ) : (
          <div className="space-y-2">
            {DAYS.map((label, idx) => {
              const wh = workingHours.find((w) => w.weekday === idx);
              const closed = !wh || wh.is_day_off;
              const hours = wh ? `${wh.open_time} – ${wh.close_time}` : "";
              return (
                <div key={label} className="flex items-center justify-between py-2 px-3 text-sm">
                  <span className="text-muted-foreground w-12">{label}</span>
                  {closed ? (
                    <span className="text-muted-foreground">Closed</span>
                  ) : (
                    <span className="font-medium">{hours}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
