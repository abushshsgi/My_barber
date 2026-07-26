import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import {
  Building2,
  Copy,
  LogOut,
  MapPin,
  QrCode,
  Scissors,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import { Button } from "@/components/ui/button";
import {
  agentApiJson,
  clearAgentTokens,
  type AgentInvite,
  type AgentMe,
  type AgentSalon,
} from "@/lib/agent-api";

export const Route = createFileRoute("/agent/")({
  component: AgentCabinetPage,
});

function AgentCabinetPage() {
  const navigate = useNavigate();

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

  const me = meQ.data;
  const invite = inviteQ.data;
  const salons = salonsQ.data?.results ?? [];
  const stats = salonsQ.data?.stats ?? me?.stats;

  function logout() {
    clearAgentTokens();
    navigate({ to: "/agent/login" });
  }

  async function copyCode() {
    const code = invite?.code || me?.code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Kod nusxalandi");
    } catch {
      toast.error("Nusxalash amalga oshmadi");
    }
  }

  async function copyLink() {
    const url = invite?.invite_url || me?.invite_url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Havola nusxalandi");
    } catch {
      toast.error("Nusxalash amalga oshmadi");
    }
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-50/80 via-background to-stone-100">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <MysaloonLogo size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Agent kabineti
              </p>
              <p className="truncate font-heading text-sm font-semibold">
                {me?.full_name ?? "…"}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-4 mr-1.5" />
            Chiqish
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 pb-16">
        {(meQ.isError || inviteQ.isError || salonsQ.isError) && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Ma&apos;lumot yuklashda xatolik. Qayta urinib ko&apos;ring.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Salonlar"
            value={stats?.salons_referred ?? 0}
            icon={Building2}
          />
          <StatCard
            label="Trialda"
            value={stats?.salons_trial ?? 0}
            icon={QrCode}
          />
          <StatCard
            label="Barberlar"
            value={stats?.barbers_referred ?? 0}
            icon={Scissors}
          />
          <StatCard
            label="Nashr etilgan"
            value={stats?.salons_published ?? 0}
            icon={Users}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Sizning QR</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Salon egasiga ko&apos;rsating — MySaloon o&apos;rnatib, shu QR orqali
                ro&apos;yxatdan o&apos;tsin. 3 hafta trial (99.990 so&apos;m) avtomatik.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 flex items-center justify-center">
              {invite?.qr_image_url ? (
                <img
                  src={invite.qr_image_url}
                  alt="Agent QR kod"
                  className="size-52 rounded-lg"
                  width={208}
                  height={208}
                />
              ) : (
                <div className="size-52 animate-pulse rounded-lg bg-muted" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Kod
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-muted px-3 py-2 font-mono text-lg font-semibold tracking-widest">
                  {invite?.code || me?.code || "————"}
                </code>
                <Button type="button" variant="outline" size="icon" onClick={copyCode}>
                  <Copy className="size-4" />
                </Button>
              </div>
              <Button type="button" variant="secondary" className="w-full" onClick={copyLink}>
                Havolani nusxalash
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-heading text-lg font-semibold">
                Olib kelgan salonlar
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                GPS, egasi va trial holati
              </p>
            </div>
            {salonsQ.isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />
                ))}
              </div>
            ) : salons.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Hali salon yo&apos;q. QR ni egaga ko&apos;rsatib, MySaloon ga
                ro&apos;yxatdan o&apos;tkazing.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {salons.map((s) => (
                  <li key={s.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-foreground truncate">{s.name}</p>
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
                          {s.owner_phone ? ` · ${s.owner_phone}` : ""}
                          {" · "}
                          {s.members_count} barber
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
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
        <Icon className="size-5 text-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl font-semibold tabular-nums">{value}</p>
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
    label = "Faol";
    cls = "bg-blue-500/10 text-blue-700";
  } else if (status === "expired") {
    label = "Tugagan";
    cls = "bg-amber-500/10 text-amber-800";
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
