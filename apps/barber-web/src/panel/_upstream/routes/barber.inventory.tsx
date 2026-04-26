import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, Minus, Package, AlertTriangle, Boxes } from "lucide-react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { PageHeader, StatCard, EmptyBlock } from "@/components/barber/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/inventory")({
  component: InventoryPage,
});

const CATEGORY_LABEL = {
  tool: "Asbob",
  product: "Mahsulot",
  consumable: "Sarf",
} as const;

function InventoryPage() {
  const { inventory, adjustInventory } = useBarberContext();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "tool" | "product" | "consumable" | "low">("all");

  const filtered = useMemo(() => {
    return inventory.filter((it) => {
      if (q && !it.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "low") return it.stock <= it.min_stock;
      if (filter !== "all" && it.category !== filter) return false;
      return true;
    });
  }, [inventory, q, filter]);

  const lowCount = inventory.filter((i) => i.stock <= i.min_stock).length;
  const totalValue = inventory.reduce((s, i) => s + i.stock * i.price, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Inventarizatsiya"
        description="Mahsulot, asbob va sarflanadigan materiallar zaxirasi."
        actions={
          <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90">
            <Plus className="size-4" />
            Mahsulot qo'shish
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Boxes className="size-4" />} label="Jami pozitsiya" value={inventory.length} />
        <StatCard icon={<Package className="size-4" />} label="Umumiy zaxira qiymati" value={formatUZS(totalValue)} />
        <StatCard
          icon={<AlertTriangle className="size-4" />}
          label="Kam zaxira"
          value={lowCount}
          hint={lowCount > 0 ? "Buyurtma bering" : "Hammasi joyida"}
        />
        <StatCard label="Kategoriya" value="3" hint="tool · product · consumable" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "low", "tool", "product", "consumable"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "all" ? "Hammasi" : f === "low" ? "Kam zaxira" : CATEGORY_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mahsulot qidirish..."
            className="h-10 pl-9 pr-3 rounded-lg bg-card border border-border focus:ring-2 focus:ring-ring outline-none text-sm w-full sm:w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock title="Hech narsa topilmadi" description="Filtrlarni o'zgartirib ko'ring." />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
          <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40">
            <div className="col-span-4">Mahsulot</div>
            <div className="col-span-2">Kategoriya</div>
            <div className="col-span-2 text-center">Zaxira</div>
            <div className="col-span-2 text-right">Narx</div>
            <div className="col-span-2 text-right">Amal</div>
          </div>
          {filtered.map((it) => {
            const low = it.stock <= it.min_stock;
            return (
              <div
                key={it.id}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-muted/30 transition-colors border-b border-border last:border-b-0"
              >
                <div className="col-span-4 min-w-0">
                  <div className="font-medium text-sm truncate">{it.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.supplier ?? "—"} · min {it.min_stock}
                  </div>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">
                  {CATEGORY_LABEL[it.category]}
                </div>
                <div className="col-span-2 text-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
                      low
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-muted text-foreground border-border",
                    )}
                  >
                    {low && <AlertTriangle className="size-3" />}
                    {it.stock} {it.unit}
                  </span>
                </div>
                <div className="col-span-2 text-right text-sm font-medium">
                  {formatUZS(it.price)}
                </div>
                <div className="col-span-2 flex justify-end gap-1">
                  <button
                    onClick={() => adjustInventory(it.id, -1)}
                    className="size-8 rounded-md border border-border hover:bg-muted flex items-center justify-center"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    onClick={() => adjustInventory(it.id, 1)}
                    className="size-8 rounded-md bg-foreground text-background hover:opacity-90 flex items-center justify-center"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
