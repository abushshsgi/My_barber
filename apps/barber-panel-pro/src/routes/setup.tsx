import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/topbar";
import { mockServices, mockWorkingHours } from "@/lib/mock-data";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  return (
    <>
      <Topbar title="Setup" />
      <div className="mx-auto max-w-3xl p-6 space-y-8">
        {/* Profile Info */}
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Profile Info</h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-muted-foreground">Full Name</label>
                <input defaultValue="Mike Barber" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground">Phone</label>
                <input defaultValue="+1 555-0100" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground">Bio</label>
              <textarea defaultValue="Professional barber with 10+ years of experience." rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
        </section>

        {/* Services */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Services</h2>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          <div className="space-y-2">
            {mockServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{service.name}</p>
                  <p className="text-[12px] text-muted-foreground">{service.duration} min</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">${service.price}</span>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Work Images */}
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Work Images</h2>
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-xl bg-muted" />
            ))}
            <button className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors">
              <Plus className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </section>

        {/* Working Hours */}
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">Working Hours</h2>
          <div className="space-y-2">
            {mockWorkingHours.map((day) => (
              <div key={day.day} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <span className="text-sm font-medium w-24">{day.day}</span>
                {day.enabled ? (
                  <span className="text-sm text-muted-foreground">{day.from} — {day.to}</span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
