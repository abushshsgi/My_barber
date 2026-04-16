"use client";

import { Topbar } from "@/components/Topbar";
import { User, Mail, Phone, MapPin } from "lucide-react";
import { useBarberMe, useBarberProfile } from "@/queries/barber";

export default function ProfilePage() {
  const me = useBarberMe();
  const prof = useBarberProfile();
  const name = me.data?.full_name || me.data?.email || "Barber";
  const email = me.data?.email || "—";
  const phone = me.data?.phone || "—";
  const location = prof.data && prof.data.exists ? prof.data.location_text || "—" : "—";

  return (
    <>
      <Topbar title="Profile" />
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-display text-xl font-semibold">{name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {me.isLoading ? "Loading..." : me.data?.work_mode || "BARBER"}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {[
            { icon: Mail, label: "Email", value: email },
            { icon: Phone, label: "Phone", value: phone },
            { icon: MapPin, label: "Location", value: location },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-4 rounded-xl border border-border p-4">
              <item.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <div>
                <p className="text-[11px] text-muted-foreground">{item.label}</p>
                <p className="text-sm font-medium">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

