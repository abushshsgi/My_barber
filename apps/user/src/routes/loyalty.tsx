import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { loyaltyMock } from "@/lib/mock-data";

export const Route = createFileRoute("/loyalty")({
  head: () => ({ meta: [{ title: "Bonus dasturi — mysaloon.uz" }] }),
  component: LoyaltyPage,
});

function LoyaltyPage() {
  const total = loyaltyMock.points + loyaltyMock.toNext;
  const pct = Math.round((loyaltyMock.points / total) * 100);

  return (
    <div className="pb-8">
      <PageHeader showBack title="Bonus dasturi" />

      <div className="mx-5 overflow-hidden rounded-2xl bg-foreground p-6 text-background">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-background/60">
            {loyaltyMock.tier} a'zo
          </p>
          <Sparkles className="h-4 w-4" />
        </div>
        <p className="mt-3 text-4xl font-bold tracking-tight">{loyaltyMock.points}</p>
        <p className="mt-1 text-xs font-bold text-background/60">bonus ball</p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-background/70">
            <span>{loyaltyMock.tier}</span>
            <span>{loyaltyMock.nextTier}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background/20">
            <div
              className="h-full rounded-full bg-background"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-bold text-background/70">
            {loyaltyMock.nextTier} darajasigacha {loyaltyMock.toNext} ball
          </p>
        </div>
      </div>

      <section className="mt-6 px-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Imtiyozlaringiz
        </h3>
        <ul className="mt-3 space-y-2">
          {loyaltyMock.perks.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-2xl border border-border p-4"
            >
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-foreground">
                <Check className="h-3.5 w-3.5 text-background" strokeWidth={3} />
              </div>
              <p className="text-sm font-medium">{p}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
