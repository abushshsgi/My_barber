import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAnalyticsJourney } from "@/lib/revenue-analytics";

export const Route = createFileRoute("/admin/analytics/users/$userId")({
  component: JourneyPage,
});

function JourneyPage() {
  const { userId } = Route.useParams();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["analytics", "journey", userId, page],
    queryFn: () => fetchAnalyticsJourney(userId, page),
  });
  const data = query.data;
  return (
    <div className="space-y-6">
      <Link to="/admin/analytics/users" className="text-sm text-muted-foreground">Orqaga</Link>
      <h1 className="font-heading text-3xl font-semibold">{data?.label || "Yo'l"}</h1>
      {data ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Fact label="Birinchi tashrif" value={data.first_visit} />
          <Fact label="Oxirgi tashrif" value={data.last_visit} />
          <Fact label="Tashriflar" value={String(data.visits)} />
          <Fact label="Sessiyalar" value={String(data.sessions)} />
          <Fact label="Ro'yxat" value={data.registered_at} />
          <Fact label="Kirish usuli" value={data.auth_method || "—"} />
          <Fact label="Manba" value={data.source} />
          <Fact label="Qurilma" value={data.device || "—"} />
          <Fact label="AI generatsiya" value={String(data.ai_generations)} />
          <Fact label="Premium sahifa" value={String(data.premium_page_views)} />
          <Fact label="Obuna tugmasi" value={String(data.subscribe_clicks)} />
          <Fact label="To'lov urinishi" value={String(data.payment_attempts)} />
          <Fact label="Tasdiqlangan to'lov" value={String(data.successful_payments)} />
          <Fact label="Obuna" value={data.subscription ? `${data.subscription.plan_code} · ${data.subscription.status}` : "Yo'q"} />
          <Fact label="Tasdiqlangan xarajat" value={`${data.confirmed_spend_uzs.toLocaleString("uz-UZ")} so'm`} />
        </div>
      ) : null}
      <ol className="space-y-2">
        {(data?.events ?? []).map((event, index) => (
          <li key={`${event.at}-${index}`} className="rounded-2xl border border-border bg-card p-4 text-sm shadow-card">
            <div className="font-medium">{event.name}</div>
            <div className="text-muted-foreground">
              {event.at.replace("T", " ").slice(0, 19)} · {event.page || "—"} · {event.status || "—"}
              {event.session ? ` · ${event.session}` : ""}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex gap-3 text-sm">
        <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Oldingi</button>
        <button type="button" disabled={(data?.events.length ?? 0) < 25} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40">Keyingi</button>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value ? value.replace("T", " ").slice(0, 19) : "—"}</div>
    </div>
  );
}
