import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Target, CheckCircle2, Circle, Trophy, Flag } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard, SectionCard } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/goals")({
  component: GoalsPage,
});

function GoalsPage() {
  const { goals, toggleGoal, addGoal } = useBarberContext();
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ title: "", target: "", unit: "ta", deadline: "" });
  const done = goals.filter((g) => g.done).length;
  const avg = Math.round(
    (goals.reduce((s, g) => s + Math.min(1, g.current / g.target), 0) / Math.max(1, goals.length)) *
      100,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Maqsadlar"
        description="O'zingizga maqsad qo'ying va rivojlanishni kuzating."
        actions={
          <button
            onClick={() => setOpenCreate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <Flag className="size-4" />
            Maqsad qo'shish
          </button>
        }
      />
      {openCreate && (
        <SectionCard title="Yangi maqsad">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            <input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="Sarlavha"
              className="sm:col-span-2 h-10 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
            />
            <input
              type="number"
              value={form.target}
              onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
              placeholder="Maqsad"
              className="h-10 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
            />
            <input
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="Birlik"
              className="h-10 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
            />
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
              className="h-10 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
            />
            <button
              onClick={async () => {
                if (!form.title.trim() || !form.target || !form.deadline) {
                  toast.error("Maydonlarni to'ldiring.");
                  return;
                }
                const ok = await addGoal({
                  title: form.title.trim(),
                  target: Number(form.target),
                  unit: form.unit.trim() || "ta",
                  deadline: form.deadline,
                });
                if (ok) {
                  toast.success("Maqsad qo'shildi.");
                  setOpenCreate(false);
                  setForm({ title: "", target: "", unit: "ta", deadline: "" });
                } else {
                  toast.error("Maqsad qo'shib bo'lmadi.");
                }
              }}
              className="h-10 px-3 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              Saqlash
            </button>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Target className="size-4" />}
          label="Jami maqsadlar"
          value={goals.length}
        />
        <StatCard
          icon={<Trophy className="size-4" />}
          label="Bajarilgan"
          value={done}
          hint={`${goals.length - done} qoldi`}
        />
        <StatCard label="O'rtacha progress" value={`${avg}%`} />
        <StatCard label="Eng yaqin muddat" value={goals.find((g) => !g.done)?.deadline ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.current / g.target) * 100));
          return (
            <SectionCard key={g.id}>
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleGoal(g.id)}
                  className={cn(
                    "mt-0.5 shrink-0 transition-colors",
                    g.done ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {g.done ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn(
                        "font-heading text-base font-semibold",
                        g.done && "line-through text-muted-foreground",
                      )}
                    >
                      {g.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">{g.deadline}</span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="font-heading text-2xl font-semibold">
                      {g.unit === "so'm" ? formatUZS(g.current) : g.current}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {g.unit === "so'm" ? formatUZS(g.target) : `${g.target} ${g.unit}`}
                    </span>
                  </div>

                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        g.done ? "bg-success" : "bg-foreground",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{pct}% bajarildi</span>
                    {g.done && (
                      <span className="text-success font-medium inline-flex items-center gap-1">
                        <Trophy className="size-3" />
                        Tabriklaymiz!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
