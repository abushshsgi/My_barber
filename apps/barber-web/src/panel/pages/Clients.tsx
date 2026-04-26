"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { EmptyBlock, PageHeader } from "@/adminhub-ui/barber/primitives";
import { Search, Phone, Users } from "lucide-react";
import { useMemo, useState } from "react";

export default function Clients() {
  const { clients } = useApp();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((c) => c.full_name.toLowerCase().includes(query));
  }, [clients, q]);

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <PageHeader title="Mijozlar" description="Sizdan xizmat olgan barcha mijozlar bazasi." />
        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mijoz qidirish..."
            className="h-10 w-full pl-9 pr-3 rounded-lg bg-card border border-border focus:ring-2 focus:ring-ring outline-none text-sm"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyBlock
          title={clients.length === 0 ? "Mijozlar yo‘q" : "Hech qanday mijoz topilmadi"}
          description={
            clients.length === 0
              ? "Mijozlar bronlar yakunlangandan keyin ko‘rinadi."
              : "Boshqa kalit so‘z bilan urinib ko‘ring."
          }
          icon={<Users className="h-5 w-5" />}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground border-b border-border bg-muted/40">
            <div className="col-span-6">Mijoz</div>
            <div className="col-span-3">Telefon</div>
            <div className="col-span-1 text-center">Bron</div>
            <div className="col-span-2 text-right">Sarflagan</div>
          </div>
          {filtered.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-muted/30 transition-colors border-b border-border last:border-b-0"
            >
              <div className="col-span-6 flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-semibold">
                  {c.full_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{c.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">ID #{c.id}</div>
                </div>
              </div>
              <div className="col-span-3 text-sm text-muted-foreground inline-flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {c.phone || c.email}
              </div>
              <div className="col-span-1 text-center text-sm font-medium">{c.completed_bookings}</div>
              <div className="col-span-2 text-right text-sm font-medium">{c.total_spent}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
