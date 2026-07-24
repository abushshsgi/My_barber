import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Loader2,
  Phone,
  Send,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatCard } from "@/components/barber/primitives";
import { apiFetch, formatApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/invites")({
  component: BarberInvitesPage,
});

type InviteRow = {
  id: number;
  customer_id: number;
  full_name: string;
  phone: string | null;
  source: string;
  code_used: string;
  joined_at: string | null;
  outreach_id: number | null;
};

type OutreachRow = {
  id: number;
  full_name: string;
  phone: string | null;
  channel: string;
  note: string;
  status: string;
  joined_customer_id: number | null;
  joined_at: string | null;
  created_at: string | null;
};

type InviteDashboard = {
  code: string;
  invite_url: string;
  invite_count: number;
  outreach_total: number;
  outreach_pending: number;
  outreach_joined: number;
  conversion_rate: number | null;
  invites: InviteRow[];
  outreaches: OutreachRow[];
};

const CHANNELS = [
  { value: "telegram", label: "Telegram" },
  { value: "phone", label: "Telefon" },
  { value: "in_person", label: "Jonli" },
  { value: "sms", label: "SMS" },
  { value: "other", label: "Boshqa" },
] as const;

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("uz-UZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function channelLabel(code: string) {
  return CHANNELS.find((c) => c.value === code)?.label ?? code;
}

function statusLabel(code: string) {
  if (code === "pending") return "Kutilmoqda";
  if (code === "joined") return "Qo'shildi";
  if (code === "cancelled") return "Bekor";
  return code;
}

function BarberInvitesPage() {
  const qc = useQueryClient();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    channel: "telegram",
    note: "",
  });

  const q = useQuery({
    queryKey: ["barber", "customer-invites"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/barber/customer-invites/");
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(body, "Ma'lumot yuklanmadi"));
      return body as InviteDashboard;
    },
  });

  const createOutreach = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/v1/barber/customer-invites/outreach/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(body, "Saqlab bo'lmadi"));
      return body;
    },
    onSuccess: () => {
      toast.success("Mijoz chaqiruvi saqlandi");
      setForm({ full_name: "", phone: "", channel: "telegram", note: "" });
      void qc.invalidateQueries({ queryKey: ["barber", "customer-invites"] });
    },
    onError: (e: Error) => toast.error(e.message || "Saqlab bo'lmadi"),
  });

  const cancelOutreach = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/barber/customer-invites/outreach/${id}/cancel/`, {
        method: "POST",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(formatApiError(body, "Bekor qilib bo'lmadi"));
      return body;
    },
    onSuccess: () => {
      toast.success("Bekor qilindi");
      void qc.invalidateQueries({ queryKey: ["barber", "customer-invites"] });
    },
    onError: (e: Error) => toast.error(e.message || "Xatolik"),
  });

  const data = q.data;
  const inviteUrl = data?.invite_url ?? "";
  const shareMessage = useMemo(() => {
    if (!data) return "";
    return (
      `Salom! Men MySaloon dasturiga taklif qilaman — bron qilish, navbat va xizmatlar bir joyda.\n` +
      `Havola: ${data.invite_url}\nKod: ${data.code}`
    );
  }, [data]);

  async function copyText(text: string, kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success(kind === "code" ? "Kod nusxalandi" : "Havola nusxalandi");
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Nusxa olishning iloji bo'lmadi");
    }
  }

  async function shareInvite() {
    if (!data || !inviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "MySaloon", text: shareMessage, url: inviteUrl });
        return;
      } catch {
        // fall through to copy
      }
    }
    await copyText(shareMessage, "link");
  }

  function openTelegramShare() {
    if (!inviteUrl) return;
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(
      "MySaloon'ga qo'shiling — mening taklifim orqali!",
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Mijozlarni chaqirish"
        description="Telegram, telefon yoki doimiy mijozlaringizni MySaloon'ga o'z taklif kodingiz bilan chaqiring."
      />

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-12 justify-center">
          <Loader2 className="size-4 animate-spin" />
          Yuklanmoqda…
        </div>
      ) : q.isError || !data ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Ma'lumot yuklanmadi. Qayta urinib ko'ring.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Qo'shilgan" value={String(data.invite_count)} icon={<Users className="size-4" />} />
            <StatCard
              label="Chaqirilgan"
              value={String(data.outreach_total)}
              icon={<Send className="size-4" />}
            />
            <StatCard
              label="Kutilmoqda"
              value={String(data.outreach_pending)}
              icon={<Phone className="size-4" />}
            />
            <StatCard
              label="Konversiya"
              value={
                data.conversion_rate != null ? `${data.conversion_rate}%` : "—"
              }
              icon={<UserPlus className="size-4" />}
            />
          </div>

          <SectionCard
            title="Sizning taklif kodingiz"
            description="Havolani Telegram yoki boshqa messenger orqali yuboring. Mijoz ro'yxatdan o'tganda sizga birikadi."
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-2xl tracking-[0.2em] font-semibold">
                  {data.code}
                </span>
                <button
                  type="button"
                  onClick={() => copyText(data.code, "code")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted/50"
                >
                  {copied === "code" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Kod
                </button>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm break-all">
                {inviteUrl}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void shareInvite()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
                >
                  <Share2 className="size-4" />
                  Ulashish
                </button>
                <button
                  type="button"
                  onClick={openTelegramShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/50"
                >
                  <Send className="size-4" />
                  Telegram
                </button>
                <button
                  type="button"
                  onClick={() => copyText(inviteUrl, "link")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted/50"
                >
                  {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  Havoladan nusxa
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Mijozni qo'lda yozib qo'yish"
            description="Telegram/telefon orqali chaqirgan mijozingizni shu yerda saqlang — u qo'shilganda avtomatik bog'lanadi."
          >
            <form
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.full_name.trim() && !form.phone.trim()) {
                  toast.error("Ism yoki telefon kiriting");
                  return;
                }
                createOutreach.mutate();
              }}
            >
              <input
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Ism"
                className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+998 90 xxx xx xx"
                className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
              />
              <select
                value={form.channel}
                onChange={(e) => setForm((p) => ({ ...p, channel: e.target.value }))}
                className="h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
              >
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={createOutreach.isPending}
                className="h-10 inline-flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {createOutreach.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Saqlash
              </button>
              <input
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="Izoh (ixtiyoriy)"
                className="sm:col-span-2 lg:col-span-4 h-10 px-3 rounded-lg bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
              />
            </form>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Qo'shilgan mijozlar" description="Kodingiz orqali MySaloon'ga kirganlar">
              {data.invites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hali hech kim qo'shilmagan.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.invites.map((row) => (
                    <li key={row.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[row.phone, fmtDate(row.joined_at)].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">
                        {row.source === "outreach" ? "Outreach" : "Havola"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Chaqiruvlar" description="Siz yozib qo'ygan mijozlar">
              {data.outreaches.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hali yozuv yo'q.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.outreaches.map((row) => (
                    <li key={row.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.full_name || row.phone || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {[channelLabel(row.channel), row.phone, fmtDate(row.created_at)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded-full border",
                            row.status === "joined"
                              ? "border-emerald-500/40 text-emerald-700 bg-emerald-500/10"
                              : row.status === "cancelled"
                                ? "border-border text-muted-foreground"
                                : "border-amber-500/40 text-amber-700 bg-amber-500/10",
                          )}
                        >
                          {statusLabel(row.status)}
                        </span>
                        {row.status === "pending" ? (
                          <button
                            type="button"
                            onClick={() => cancelOutreach.mutate(row.id)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Bekor
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
