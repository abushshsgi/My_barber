import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { agentApiJson, formatUzs, type AgentInvite, type AgentMe } from "@/lib/agent-api";

export const Route = createFileRoute("/agent/invite")({
  component: AgentInvitePage,
});

function AgentInvitePage() {
  const meQ = useQuery({
    queryKey: ["agent", "me"],
    queryFn: () => agentApiJson<AgentMe>("/api/v1/agent/me/"),
  });
  const inviteQ = useQuery({
    queryKey: ["agent", "invite"],
    queryFn: () => agentApiJson<AgentInvite>("/api/v1/agent/invite/"),
  });
  const invite = inviteQ.data;
  const me = meQ.data;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} nusxalandi`);
    } catch {
      toast.error("Nusxalash amalga oshmadi");
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-heading text-2xl font-semibold">QR / Kod</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Salon egasiga telefon yoki noutbukda shu QR ni oching. Partnerda «Skaner»
          yoki kod maydoniga yozsa ham sizga bog&apos;lanadi. 3 hafta trial ({formatUzs(invite?.trial_value_uzs ?? 99990)})
          avtomatik.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-4">
        <div className="rounded-xl border border-border bg-background p-3 flex justify-center">
          {invite?.qr_image_url ? (
            <img
              src={invite.qr_image_url}
              alt="Agent QR"
              className="size-56 rounded-lg"
              width={224}
              height={224}
            />
          ) : (
            <div className="size-56 animate-pulse rounded-lg bg-muted" />
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(invite?.code || me?.code || "", "Kod")}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => copy(invite?.invite_url || me?.invite_url || "", "Havola")}
          >
            Havolani nusxalash
          </Button>
        </div>
      </div>
    </div>
  );
}
