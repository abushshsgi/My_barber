import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Gift } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { giftCards, formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/giftcard")({
  head: () => ({ meta: [{ title: "Sovg'a karta — mysaloon.uz" }] }),
  component: GiftCardPage,
});

function GiftCardPage() {
  const [selectedId, setSelectedId] = useState(giftCards[1].id);
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="pb-8">
      <PageHeader showBack title="Sovg'a karta" />

      <div className="mx-5 overflow-hidden rounded-2xl bg-foreground p-6 text-background">
        <div className="flex items-center justify-between">
          <Gift className="h-5 w-5" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-background/60">
            mysaloon.uz
          </p>
        </div>
        <p className="mt-8 text-3xl font-bold tracking-tight">
          {formatPrice(giftCards.find((g) => g.id === selectedId)?.amount ?? 0)}
        </p>
        <p className="mt-1 text-xs font-bold text-background/60">
          {recipient || "Sovg'a oluvchi ismi"}
        </p>
      </div>

      <section className="mt-6 px-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Summani tanlang
        </h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {giftCards.map((g) => {
            const active = selectedId === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                className={cn(
                  "rounded-2xl border-2 p-3 text-left transition-all",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                  {g.label}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {Math.round(g.amount / 1000)}k
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6 space-y-3 px-5">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Kimga
          </label>
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Ism va familiya"
            className="mt-2 w-full rounded-2xl border-0 bg-surface px-4 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Tabriknoma
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Sovg'aga qisqa xabar"
            className="mt-2 w-full resize-none rounded-2xl border-0 bg-surface px-4 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
          />
        </div>
      </section>

      <div className="mt-8 px-5">
        <button className="w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background active:scale-[0.98] transition-transform">
          Sovg'ani yuborish
        </button>
      </div>
    </div>
  );
}
