import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Building2, Scissors, Wallet } from "lucide-react";
import { fetchAgentDetail } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/agents/$agentId")({
  component: AdminAgentDetailPage,
});

function AdminAgentDetailPage() {
  const { agentId } = Route.useParams();
  const q = useQuery({
    queryKey: ["admin", "agent-detail", agentId],
    queryFn: () => fetchAgentDetail(Number(agentId)),
  });
  const d = q.data;

  if (q.isLoading || !d) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-4">
        <CardSkeleton />
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }

  const a = d.agent;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/admin/agents"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="size-4 mr-1" /> Agentlar
          </Link>
          <h1 className="font-heading text-3xl font-semibold">{a.full_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {a.email} · {a.phone || "tel yo'q"} · kod{" "}
            <code className="font-mono font-semibold text-foreground">{a.code}</code>
          </p>
        </div>
        <StatusBadge status={a.is_active ? "active" : "inactive"} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Salonlar" value={d.salons.length} icon={Building2} />
        <KPICard label="Barberlar" value={d.barbers.length} icon={Scissors} />
        <KPICard
          label="Hamyon"
          value={formatAdminUzs(d.wallet.balance)}
          icon={Wallet}
        />
        <KPICard label="Hisob" value={d.wallet.account_number} />
      </div>

      <p className="text-sm text-muted-foreground">
        Tarif: salon avansi {formatAdminUzs(d.config.salon_advance_uzs)} · agent
        komissiyasi {formatAdminUzs(d.config.commission_uzs)}
      </p>

      <Section title="Salonlar (batafsil)">
        {d.salons.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
              <tr>
                <th className="px-4 py-3">Salon</th>
                <th className="px-4 py-3">Ega</th>
                <th className="px-4 py-3">GPS</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.salons.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.address || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{s.owner_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.owner_phone || s.owner_email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums">
                    {s.latitude != null && s.longitude != null
                      ? `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {s.subscription_status} · {s.members_count} barber
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {format(new Date(s.created_at), "dd MMM yyyy HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Barberlar">
        {d.barbers.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
              <tr>
                <th className="px-4 py-3">Ism</th>
                <th className="px-4 py-3">Aloqa</th>
                <th className="px-4 py-3">Flow</th>
                <th className="px-4 py-3">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.barbers.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-medium">{b.full_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {b.email}
                    <br />
                    {b.phone}
                  </td>
                  <td className="px-4 py-3">
                    {b.onboarding_flow} / {b.business_kind || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.date_joined
                      ? format(new Date(b.date_joined), "dd MMM yyyy")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Moliyaviy hodisalar">
          {d.events.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y text-sm">
              {d.events.map((ev) => (
                <li key={ev.id} className="px-4 py-3 flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{ev.kind}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.salon_name || "—"} · {ev.barber_name || "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold">{formatAdminUzs(ev.amount_uzs)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(ev.created_at), "dd MMM HH:mm")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Hamyon ledger">
          {d.ledger.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y text-sm">
              {d.ledger.map((e) => (
                <li key={e.id} className="px-4 py-3 flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{e.entry_type}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      {e.id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatAdminUzs(e.amount)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      qoldiq {formatAdminUzs(e.balance_after)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Payout so'rovlari">
        {d.payouts.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b bg-background">
              <tr>
                <th className="px-4 py-3">Summa</th>
                <th className="px-4 py-3">Karta</th>
                <th className="px-4 py-3">Holat</th>
                <th className="px-4 py-3">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.payouts.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-semibold">{formatAdminUzs(p.amount)}</td>
                  <td className="px-4 py-3 text-xs">
                    {p.holder_name} · {p.bank_name} · ****{p.card_last4}
                  </td>
                  <td className="px-4 py-3">{p.status}</td>
                  <td className="px-4 py-3 text-xs">
                    {format(new Date(p.created_at), "dd MMM HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="p-8 text-center text-sm text-muted-foreground">Bo&apos;sh</div>;
}
