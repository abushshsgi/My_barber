import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Gift, ArrowDownLeft, ArrowUpRight, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Hamyon — mysaloon.uz" },
      { name: "description", content: "Cashback balansi, sovg'a kartalar va to'lov tarixi." },
    ],
  }),
  component: WalletPage,
});

type Tab = "all" | "in" | "out";

interface Tx {
  id: string;
  kind: "in" | "out";
  title: string;
  date: string;
  amount: number;
}

const TXS: Tx[] = [
  { id: "t1", kind: "in", title: "Cashback · Modern Cuts", date: "Bugun", amount: 12000 },
  { id: "t2", kind: "out", title: "Bron · Lazzat Spa", date: "Kecha", amount: -180000 },
  { id: "t3", kind: "in", title: "Do'stni taklif qildingiz", date: "2 kun oldin", amount: 25000 },
  { id: "t4", kind: "out", title: "Sovg'a karta · Madina", date: "5 kun oldin", amount: -100000 },
  { id: "t5", kind: "in", title: "Promo · Yangi yil", date: "1 hafta", amount: 50000 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.abs(n)) + " so'm";
}

function WalletPage() {
  const [tab, setTab] = useState<Tab>("all");
  const visible = TXS.filter((t) => tab === "all" || t.kind === tab);
  const balance = TXS.reduce((a, t) => a + t.amount, 0) + 240000;

  return (
    <div className="pb-24">
      <PageHeader title="Hamyon" subtitle="Cashback, sovg'a karta, tarix" />

      {/* Balance card */}
      <section className="px-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-5 text-white"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.42 0.18 280), oklch(0.28 0.14 320))",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">
                Joriy balans
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{fmt(balance)}</p>
              <p className="mt-1 text-[11px] font-bold text-white/80">
                +12% bu oy
              </p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15 backdrop-blur-md">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button className="flex-1 rounded-full bg-white py-2.5 text-[12px] font-bold text-black active:scale-95">
              <Plus className="mr-1 inline h-3.5 w-3.5" /> To'ldirish
            </button>
            <Link
              to="/giftcard"
              className="flex-1 rounded-full bg-white/20 py-2.5 text-center text-[12px] font-bold backdrop-blur-md active:scale-95"
            >
              <Gift className="mr-1 inline h-3.5 w-3.5" /> Sovg'a
            </Link>
          </div>
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18), transparent 70%)" }}
          />
        </motion.div>
      </section>

      {/* Stats */}
      <section className="mt-5 grid grid-cols-3 gap-2 px-5">
        {[
          { label: "Cashback", value: "87k" },
          { label: "Bonus", value: "240" },
          { label: "Tarix", value: TXS.length.toString() },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-surface p-3 text-center">
            <p className="text-base font-bold">{s.value}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </section>

      {/* Tabs */}
      <section className="mt-6 px-5">
        <div className="inline-flex rounded-full bg-surface p-1">
          {(["all", "in", "out"] as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12px] font-bold transition-colors",
                tab === k ? "bg-foreground text-background" : "text-foreground/70",
              )}
            >
              {k === "all" ? "Hammasi" : k === "in" ? "Kirim" : "Chiqim"}
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-2">
          {visible.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
            >
              <div
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full",
                  t.kind === "in" ? "bg-green-500/15 text-green-600" : "bg-foreground/10 text-foreground",
                )}
              >
                {t.kind === "in" ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{t.title}</p>
                <p className="text-[11px] text-muted-foreground">{t.date}</p>
              </div>
              <p
                className={cn(
                  "shrink-0 text-sm font-bold",
                  t.kind === "in" ? "text-green-600" : "text-foreground",
                )}
              >
                {t.kind === "in" ? "+" : "−"}
                {fmt(t.amount)}
              </p>
            </li>
          ))}
        </ul>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[12px] font-bold">
          <Receipt className="h-4 w-4" /> To'liq tarix
        </button>
      </section>
    </div>
  );
}
