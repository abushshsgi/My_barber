import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { agentApiJson, formatUzs, type AgentWalletPayload } from "@/lib/agent-api";

export const Route = createFileRoute("/agent/aylanma")({
  component: AgentAylanmaPage,
});

const KIND_LABEL: Record<string, string> = {
  salon_advance: "Salon avansi",
  commission: "Komissiya",
  commission_in: "Komissiya",
  payout_out: "Payout",
  payout_refund: "Payout qaytarildi",
  advance_out: "Avans",
  adjustment: "Tuzatish",
};

function AgentAylanmaPage() {
  const walletQ = useQuery({
    queryKey: ["agent", "wallet"],
    queryFn: () => agentApiJson<AgentWalletPayload>("/api/v1/agent/wallet/"),
  });
  const d = walletQ.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Aylanma</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Salonlarga berilgan avanslar, sizga tushgan komissiyalar va ledger
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card label="Hamyon balansi" value={formatUzs(d?.balance ?? 0)} />
        <Card label="Salon avansi (tarif)" value={formatUzs(d?.salon_advance_uzs ?? 0)} />
        <Card label="Komissiya (tarif)" value={formatUzs(d?.commission_uzs ?? 0)} />
      </div>

      <Section title="Hodisalar (avans / komissiya)">
        {(d?.events ?? []).length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border">
            {d!.events.map((ev) => (
              <li key={ev.id} className="px-5 py-3 flex justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{KIND_LABEL[ev.kind] || ev.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.salon_name || "—"}
                    {ev.barber_name ? ` · ${ev.barber_name}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold tabular-nums">{formatUzs(ev.amount_uzs)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(ev.created_at), "dd MMM HH:mm", { locale: uz })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Ledger (hamyon)">
        {(d?.ledger ?? []).length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border">
            {d!.ledger.map((e) => (
              <li key={e.id} className="px-5 py-3 flex justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{KIND_LABEL[e.entry_type] || e.entry_type}</p>
                  <p className="text-xs text-muted-foreground font-mono">{e.id.slice(0, 8)}…</p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-semibold tabular-nums ${e.amount >= 0 ? "text-emerald-700" : "text-amber-800"}`}
                  >
                    {e.amount >= 0 ? "+" : ""}
                    {formatUzs(e.amount)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    qoldiq {formatUzs(e.balance_after)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-heading font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="p-8 text-center text-sm text-muted-foreground">Hali yozuv yo&apos;q</div>;
}
