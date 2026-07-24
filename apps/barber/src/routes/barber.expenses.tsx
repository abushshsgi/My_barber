import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Receipt, TrendingDown, Wallet } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard, SectionCard } from "@/components/barber/primitives";
import { ShopPaywall } from "@/components/barber/ShopPaywall";
import { useShopSubscriptionMe } from "@/hooks/use-shop-subscription";
import { featureAllowed } from "@/lib/shop-subscription";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/expenses")({
  component: ExpensesPage,
});

const CATEGORY_LABEL = {
  rent: "Ijara",
  supplies: "Materiallar",
  marketing: "Marketing",
  utility: "Kommunal",
  salary: "Maosh",
  other: "Boshqa",
} as const;

type Cat = keyof typeof CATEGORY_LABEL;

function ExpensesPage() {
  const { expenses, addExpense } = useBarberContext();
  const { data: shopMe } = useShopSubscriptionMe();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ category: Cat; description: string; amount: string }>({
    category: "supplies",
    description: "",
    amount: "",
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = useMemo(() => {
    const m = new Map<Cat, number>();
    expenses.forEach((e) => m.set(e.category, (m.get(e.category) ?? 0) + e.amount));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  const max = Math.max(1, ...byCat.map(([, v]) => v));

  if (!featureAllowed(shopMe?.entitlements, "expenses")) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <PageHeader title="Xarajatlar" description="Biznes xarajatlarini kuzating." />
        <ShopPaywall
          title="Xarajatlar — Business+"
          description="Xarajatlar moduli Start tarifida yo'q. Business yoki Pro ga o'ting."
          requiredPlan="business"
          className="mt-6"
        />
      </div>
    );
  }

  const handleAdd = () => {
    const amt = parseInt(form.amount, 10);
    if (!form.description.trim() || !amt) {
      toast.error("Tavsif va summa to'ldirilishi kerak");
      return;
    }
    addExpense({
      date: new Date().toISOString().slice(0, 10),
      category: form.category,
      description: form.description.trim(),
      amount: amt,
    });
    toast.success("Xarajat qo'shildi");
    setForm({ category: "supplies", description: "", amount: "" });
    setOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Xarajatlar"
        description="Biznesingiz xarajatlarini kuzatib boring."
        actions={
          <button
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
          >
            <Plus className="size-4" />
            Yangi xarajat
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Wallet className="size-4" />}
          label="Jami xarajat"
          value={formatUZS(total)}
          hint="Ushbu davrda"
        />
        <StatCard
          icon={<Receipt className="size-4" />}
          label="Yozuvlar soni"
          value={expenses.length}
        />
        <StatCard
          icon={<TrendingDown className="size-4" />}
          label="Eng katta xarajat"
          value={formatUZS(Math.max(...expenses.map((e) => e.amount), 0))}
        />
        <StatCard label="Kategoriyalar" value={byCat.length} />
      </div>

      {open && (
        <SectionCard title="Yangi xarajat qo'shish">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Cat })}
              className="sm:col-span-3 h-10 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
            >
              {(Object.keys(CATEGORY_LABEL) as Cat[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORY_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tavsif"
              className="sm:col-span-5 h-10 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
            />
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="Summa (so'm)"
              className="sm:col-span-2 h-10 px-3 rounded-lg bg-muted border border-transparent focus:border-border focus:bg-background outline-none text-sm"
            />
            <button
              onClick={handleAdd}
              className="sm:col-span-2 h-10 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              Saqlash
            </button>
          </div>
        </SectionCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Kategoriyalar bo'yicha" className="lg:col-span-1">
          <div className="space-y-3">
            {byCat.map(([cat, val]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">{CATEGORY_LABEL[cat]}</span>
                  <span className="font-medium">{formatUZS(val)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full transition-all"
                    style={{ width: `${(val / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="So'nggi xarajatlar" className="lg:col-span-2">
          <div className="space-y-1">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div
                  className={cn(
                    "size-9 rounded-lg flex items-center justify-center bg-muted text-foreground",
                  )}
                >
                  <Receipt className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {CATEGORY_LABEL[e.category]} · {e.date}
                  </div>
                </div>
                <div className="text-sm font-semibold text-destructive">−{formatUZS(e.amount)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
