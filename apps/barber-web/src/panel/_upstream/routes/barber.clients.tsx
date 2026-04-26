import { createFileRoute } from "@tanstack/react-router";
import { Search, Phone } from "lucide-react";
import { useState } from "react";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { EmptyBlock } from "@/components/barber/primitives";

export const Route = createFileRoute("/barber/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const { clients } = useBarberContext();
  const [q, setQ] = useState("");

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">Mijozlar</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sizdan xizmat olgan barcha mijozlar bazasi.
          </p>
        </div>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mijoz qidirish..."
            className="h-10 pl-9 pr-3 rounded-lg bg-card border border-border focus:ring-2 focus:ring-ring outline-none text-sm w-full sm:w-72"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock title="Hech qanday mijoz topilmadi" description="Boshqa kalit so'z bilan urinib ko'ring." />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-card">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40">
            <div className="col-span-5">Mijoz</div>
            <div className="col-span-3">Telefon</div>
            <div className="col-span-1 text-center">Tashriflar</div>
            <div className="col-span-2">So'nggi</div>
            <div className="col-span-1 text-right">Sarflagan</div>
          </div>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-muted/30 transition-colors border-b border-border last:border-b-0"
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <img src={c.avatar} alt="" className="size-9 rounded-full shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground">ID #{c.id}</div>
                </div>
              </div>
              <div className="col-span-3 text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <Phone className="size-3" />
                {c.phone}
              </div>
              <div className="col-span-1 text-center text-sm font-medium">{c.visits}</div>
              <div className="col-span-2 text-sm text-muted-foreground">{c.last_visit}</div>
              <div className="col-span-1 text-right text-sm font-medium">{formatUZS(c.spent)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
