import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { MapPin } from "lucide-react";
import { agentApiJson, type AgentMe, type AgentSalon } from "@/lib/agent-api";

export const Route = createFileRoute("/agent/salons")({
  component: AgentSalonsPage,
});

function AgentSalonsPage() {
  const salonsQ = useQuery({
    queryKey: ["agent", "salons"],
    queryFn: () =>
      agentApiJson<{ results: AgentSalon[]; stats: AgentMe["stats"] }>(
        "/api/v1/agent/salons/",
      ),
  });
  const salons = salonsQ.data?.results ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Olib kelgan salonlar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          GPS, egasi, barberlar soni va trial holati
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        {salonsQ.isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : salons.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Hali salon yo&apos;q. QR ni egaga ko&apos;rsatib ro&apos;yxatdan o&apos;tkazing.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {salons.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {s.address ||
                          (s.latitude != null && s.longitude != null
                            ? `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`
                            : "Manzil yo'q")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ega: {s.owner_name || "—"}
                      {s.owner_phone ? ` · ${s.owner_phone}` : ""} · {s.members_count}{" "}
                      barber
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <StatusPill status={s.subscription_status} trialEnds={s.trial_ends_at} />
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {format(new Date(s.created_at), "dd MMM yyyy", { locale: uz })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusPill({
  status,
  trialEnds,
}: {
  status: string;
  trialEnds: string | null;
}) {
  let label = status || "none";
  let cls = "bg-muted text-muted-foreground";
  if (status === "trial") {
    label = trialEnds
      ? `Trial · ${formatDistanceToNow(new Date(trialEnds), { locale: uz, addSuffix: true })}`
      : "Trial";
    cls = "bg-emerald-500/10 text-emerald-700";
  } else if (status === "active") {
    label = "To'lov qilingan";
    cls = "bg-blue-500/10 text-blue-700";
  } else if (status === "expired") {
    label = "Trial tugagan";
    cls = "bg-amber-500/10 text-amber-800";
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
