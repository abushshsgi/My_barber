import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, QrCode, Scissors, Users, Wallet } from "lucide-react";
import {
  agentApiJson,
  formatUzs,
  type AgentInvite,
  type AgentMe,
  type AgentSalon,
  type AgentWalletPayload,
} from "@/lib/agent-api";

export const Route = createFileRoute("/agent/")({
  component: AgentDashboardPage,
});

function AgentDashboardPage() {
  const meQ = useQuery({
    queryKey: ["agent", "me"],
    queryFn: () => agentApiJson<AgentMe>("/api/v1/agent/me/"),
  });
  const inviteQ = useQuery({
    queryKey: ["agent", "invite"],
    queryFn: () => agentApiJson<AgentInvite>("/api/v1/agent/invite/"),
  });
  const salonsQ = useQuery({
    queryKey: ["agent", "salons"],
    queryFn: () =>
      agentApiJson<{ results: AgentSalon[]; stats: AgentMe["stats"] }>(
        "/api/v1/agent/salons/",
      ),
  });
  const walletQ = useQuery({
    queryKey: ["agent", "wallet"],
    queryFn: () => agentApiJson<AgentWalletPayload>("/api/v1/agent/wallet/"),
  });

  const stats = salonsQ.data?.stats ?? meQ.data?.stats;
  const err = meQ.isError || inviteQ.isError || salonsQ.isError;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Salon toping → QR ko&apos;rsating → egasi MySaloon ga o&apos;tsin. Trial tugab
          to&apos;lov qilinsa, komissiya hamyoningizga tushadi.
        </p>
      </div>

      {err && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Ma&apos;lumot yuklashda xatolik.{" "}
          {meQ.error instanceof Error ? meQ.error.message : "Qayta urinib ko&apos;ring."}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Stat label="Salonlar" value={stats?.salons_referred ?? 0} icon={Building2} />
        <Stat label="Trialda" value={stats?.salons_trial ?? 0} icon={QrCode} />
        <Stat label="Barberlar" value={stats?.barbers_referred ?? 0} icon={Scissors} />
        <Stat label="Nashr" value={stats?.salons_published ?? 0} icon={Users} />
        <Stat
          label="Hamyon"
          value={formatUzs(walletQ.data?.balance ?? 0)}
          icon={Wallet}
          text
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
          <h2 className="font-heading font-semibold">Qanday ishlaydi?</h2>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal pl-4">
            <li>Salon / sartaroshxonaga boring, egaga MySaloon o&apos;rnating.</li>
            <li>
              <Link to="/agent/invite" className="text-foreground font-medium underline">
                QR yoki kod
              </Link>{" "}
              ni egaga ko&apos;rsating — u bilan ro&apos;yxatdan o&apos;tsin.
            </li>
            <li>Salon ochilganda 3 hafta trial + salon hisobiga avans tushadi.</li>
            <li>Trial tugab egasi obuna to&apos;laganda komissiya sizning hamyoningizga tushadi.</li>
            <li>
              <Link to="/agent/payout" className="text-foreground font-medium underline">
                Payout
              </Link>{" "}
              so&apos;rang — admin tasdiqlaydi.
            </li>
          </ol>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
          <h2 className="font-heading font-semibold">Tariflar</h2>
          <p className="text-sm text-muted-foreground">
            Salon avansi:{" "}
            <span className="font-semibold text-foreground">
              {formatUzs(walletQ.data?.salon_advance_uzs ?? 30000)}
            </span>{" "}
            (egasi hisobiga)
          </p>
          <p className="text-sm text-muted-foreground">
            Sizning komissiyangiz:{" "}
            <span className="font-semibold text-foreground">
              {formatUzs(walletQ.data?.commission_uzs ?? 50000)}
            </span>{" "}
            (to&apos;lovdan keyin)
          </p>
          <p className="text-sm text-muted-foreground">
            Kod:{" "}
            <code className="font-mono font-semibold text-foreground">
              {inviteQ.data?.code || meQ.data?.code || "—"}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  text,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  text?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`font-heading font-semibold tabular-nums truncate ${text ? "text-sm" : "text-2xl"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
