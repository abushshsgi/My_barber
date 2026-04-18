"use client";
import { User, Clock, Scissors } from "lucide-react";

export default function Profile() {
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
            <h2 className="text-lg font-semibold">John Doe</h2>
            <p className="text-sm text-muted-foreground">Professional Barber</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Full Name</label>
            <input defaultValue="John Doe" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</label>
            <input defaultValue="+1 (555) 000-0000" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Email</label>
            <input defaultValue="john@mybarber.com" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2"><Scissors className="h-4 w-4" /> Services</h3>
        <div className="space-y-2">
          {[
            { name: "Classic Haircut", price: 35, duration: "30 min" },
            { name: "Beard Trim", price: 20, duration: "20 min" },
            { name: "Full Service", price: 55, duration: "60 min" },
            { name: "Fade Haircut", price: 40, duration: "45 min" },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">{s.name}</span>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{s.duration}</span>
                <span className="font-medium text-foreground">${s.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2"><Clock className="h-4 w-4" /> Working Hours</h3>
        <div className="space-y-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
            <div key={day} className="flex items-center justify-between py-2 px-3 text-sm">
              <span className="text-muted-foreground w-12">{day}</span>
              <span className="font-medium">09:00 – 18:00</span>
            </div>
          ))}
          {["Sat"].map((day) => (
            <div key={day} className="flex items-center justify-between py-2 px-3 text-sm">
              <span className="text-muted-foreground w-12">{day}</span>
              <span className="font-medium">10:00 – 16:00</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 px-3 text-sm">
            <span className="text-muted-foreground w-12">Sun</span>
            <span className="text-muted-foreground">Closed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
