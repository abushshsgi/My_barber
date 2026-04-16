"use client";

import { Topbar } from "@/components/Topbar";
import { Plus, Trash2 } from "lucide-react";

export default function SetupPage() {
  return (
    <>
      <Topbar title="Setup" />
      <div className="mx-auto max-w-3xl p-6 space-y-8">
        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground mb-4">
            Profile Info
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] text-muted-foreground">Full Name</label>
                <input
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground">Phone</label>
                <input
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground">Bio</label>
              <textarea
                defaultValue=""
                rows={3}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Services</h2>
            <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Haircut</p>
                <p className="text-[12px] text-muted-foreground">30 min</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">$30</span>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

