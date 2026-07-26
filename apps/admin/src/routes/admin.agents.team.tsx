import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Copy,
  Plus,
  QrCode,
  Scissors,
  UserPlus,
  Users,
} from "lucide-react";
import {
  createFieldAgent,
  fetchAgentPlatformStats,
  fetchFieldAgents,
  updateFieldAgent,
} from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton, TableSkeleton } from "@/components/admin/Skeletons";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/agents/team")({
  component: AdminAgentsTeamPage,
});

function AdminAgentsTeamPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    notes: "",
  });

  const statsQ = useQuery({
    queryKey: ["admin", "agent-stats"],
    queryFn: fetchAgentPlatformStats,
  });

  const agentsQ = useQuery({
    queryKey: ["admin", "agents", q],
    queryFn: () => fetchFieldAgents({ q: q || undefined }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      createFieldAgent({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        notes: form.notes.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      qc.invalidateQueries({ queryKey: ["admin", "agent-stats"] });
      toast.success("Agent yaratildi");
      setOpen(false);
      setForm({ full_name: "", email: "", phone: "", password: "", notes: "" });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Yaratishda xatolik"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateFieldAgent(id, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      qc.invalidateQueries({ queryKey: ["admin", "agent-stats"] });
      toast.success("Holat yangilandi");
    },
  });

  const stats = statsQ.data;
  const agents = agentsQ.data ?? [];

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} nusxalandi`);
    } catch {
      toast.error("Nusxalash amalga oshmadi");
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Sotuv agentlari
          </h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
            Har bir agent QR/kod orqali salonlarni MySaloon ga olib kiradi. 3 hafta
            trial (99.990 so&apos;m) avtomatik beriladi.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          Agent qo&apos;shish
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statsQ.isLoading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <KPICard label="Agentlar" value={stats.agents_total} icon={Users} />
            <KPICard label="Faol agent" value={stats.agents_active} icon={UserPlus} />
            <KPICard label="Salonlar" value={stats.salons_referred} icon={Building2} />
            <KPICard label="Trialda" value={stats.salons_trial} icon={QrCode} />
            <KPICard label="Barberlar" value={stats.barbers_referred} icon={Scissors} />
            <KPICard label="Trial tugagan" value={stats.salons_expired} />
          </>
        )}
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Qidiruv: ism, email, kod…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {agentsQ.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : agents.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Agentlar yo&apos;q. Birinchi agentni yarating.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Agent</th>
                  <th className="px-6 py-3 font-medium">Kod</th>
                  <th className="px-6 py-3 font-medium">Salonlar</th>
                  <th className="px-6 py-3 font-medium">Trial</th>
                  <th className="px-6 py-3 font-medium">Oxirgi kirish</th>
                  <th className="px-6 py-3 font-medium">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map((a) => (
                  <tr key={a.id} className="hover:bg-background/50">
                    <td className="px-6 py-4">
                      <Link
                        to="/admin/agents/$agentId"
                        params={{ agentId: String(a.id) }}
                        className="font-medium hover:underline"
                      >
                        {a.full_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{a.email}</div>
                      {a.phone ? (
                        <div className="text-xs text-muted-foreground">{a.phone}</div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-xs font-semibold tracking-wider">
                          {a.code}
                        </code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => copyText(a.code, "Kod")}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => copyText(a.invite_url, "Havola")}
                        >
                          Link
                        </Button>
                      </div>
                    </td>
                    <td className="px-6 py-4 tabular-nums">
                      {a.stats?.salons_referred ?? 0}
                    </td>
                    <td className="px-6 py-4 tabular-nums">
                      {a.stats?.salons_trial ?? 0}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground tabular-nums">
                      {a.last_login
                        ? format(new Date(a.last_login), "dd MMM HH:mm")
                        : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={a.is_active}
                          onCheckedChange={(v) =>
                            toggleMut.mutate({ id: a.id, is_active: v })
                          }
                        />
                        <StatusBadge status={a.is_active ? "active" : "inactive"} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi agent</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createMut.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>To&apos;liq ism</Label>
              <Input
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Parol</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Izoh</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Saqlanmoqda…" : "Yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
