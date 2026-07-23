import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, QrCode, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/barber/primitives";
import { useBarberContext, formatUZS } from "@/components/barber/BarberContext";
import { Button } from "@/components/ui/button";
import { apiFetch, formatApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/qr-pay")({
  component: BarberQrPayPage,
});

type QrProfile = {
  public_code: string;
  payload: string;
  is_active: boolean;
  qr_image_url: string;
  barber_name?: string;
};

type QrRequest = {
  id: string;
  amount: string;
  note: string;
  status: string;
  expires_at: string | null;
  payload: string;
  qr_image_url: string;
};

type QrPaymentRow = {
  id: string;
  amount: string;
  note: string;
  status: string;
  payer_name: string;
  created_at: string;
};

type QrPaymentsResponse = {
  total_received: string;
  count: number;
  results: QrPaymentRow[];
};

function BarberQrPayPage() {
  const { fullyReady } = useBarberContext();
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [activeRequest, setActiveRequest] = useState<QrRequest | null>(null);

  const profileQ = useQuery({
    queryKey: ["barber", "qr-pay", "profile"],
    queryFn: async () => apiFetch<QrProfile>("/api/v1/barber/qr-pay/profile/"),
    enabled: fullyReady,
  });

  const paymentsQ = useQuery({
    queryKey: ["barber", "qr-pay", "payments"],
    queryFn: async () => apiFetch<QrPaymentsResponse>("/api/v1/barber/qr-pay/payments/"),
    enabled: fullyReady,
    refetchInterval: 15_000,
  });

  const toggleMut = useMutation({
    mutationFn: async (is_active: boolean) =>
      apiFetch<QrProfile>("/api/v1/barber/qr-pay/profile/", {
        method: "PATCH",
        body: JSON.stringify({ is_active }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["barber", "qr-pay", "profile"], data);
      toast.success(data.is_active ? "QR to'lov yoqildi" : "QR to'lov o'chirildi");
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const createReqMut = useMutation({
    mutationFn: async () =>
      apiFetch<QrRequest>("/api/v1/barber/qr-pay/requests/", {
        method: "POST",
        body: JSON.stringify({
          amount: amount.trim() ? Number(amount.replace(/\s/g, "")) : 0,
          note: note.trim(),
          expires_minutes: 60,
        }),
      }),
    onSuccess: (data) => {
      setActiveRequest(data);
      toast.success(data.amount !== "0" ? "Summali QR yaratildi" : "Ochiq QR so'rov yaratildi");
    },
    onError: (e) => toast.error(formatApiError(e)),
  });

  const display = activeRequest ?? profileQ.data;
  const qrUrl = display?.qr_image_url;
  const payload = display?.payload ?? "";

  const copyPayload = async () => {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      toast.success("QR kod nusxalandi");
    } catch {
      toast.error("Nusxa olinmadi");
    }
  };

  const payments = paymentsQ.data?.results ?? [];
  const total = useMemo(
    () => Number(paymentsQ.data?.total_received ?? 0),
    [paymentsQ.data?.total_received],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <PageHeader
        title="QR to'lov"
        description="Mijozlar hamyonidan QR orqali to'lov qabul qiling. Pul yechib olish balansiga qo'shiladi."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">Sizning QR</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeRequest
                  ? activeRequest.amount !== "0"
                    ? `So'rov: ${formatUZS(Number(activeRequest.amount))}`
                    : "Vaqtinchalik ochiq so'rov"
                  : "Doimiy kod — mijoz summani o'zi kiritadi"}
              </p>
            </div>
            {profileQ.data ? (
              <button
                type="button"
                disabled={toggleMut.isPending}
                onClick={() => toggleMut.mutate(!profileQ.data!.is_active)}
                className="inline-flex items-center gap-1.5 text-xs font-bold"
              >
                {profileQ.data.is_active ? (
                  <>
                    <ToggleRight className="size-5 text-emerald-600" /> Faol
                  </>
                ) : (
                  <>
                    <ToggleLeft className="size-5 text-muted-foreground" /> O'chiq
                  </>
                )}
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid place-items-center rounded-2xl bg-surface p-4">
            {profileQ.isLoading ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : qrUrl ? (
              <img src={qrUrl} alt="QR to'lov" className="size-[240px] rounded-xl bg-white p-2" />
            ) : (
              <QrCode className="size-16 text-muted-foreground" />
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => void copyPayload()}>
              <Copy className="mr-1.5 size-4" /> Nusxa
            </Button>
            {activeRequest ? (
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setActiveRequest(null)}
              >
                <RefreshCw className="mr-1.5 size-4" /> Doimiy QR
              </Button>
            ) : null}
          </div>
          <p className="mt-2 break-all font-mono text-[10px] text-muted-foreground">{payload}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5">
            <p className="text-sm font-bold">Summali QR yaratish</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bo'sh qoldirsangiz — mijoz o'zi summa kiritadi. 60 daqiqa amal qiladi.
            </p>
            <label className="mt-3 block text-xs font-semibold text-muted-foreground">Summa (so'm)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              placeholder="Masalan 50000"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold"
            />
            <label className="mt-3 block text-xs font-semibold text-muted-foreground">Izoh</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Soch olish, soqol…"
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={createReqMut.isPending || !fullyReady}
              onClick={() => createReqMut.mutate()}
            >
              {createReqMut.isPending ? <Loader2 className="size-4 animate-spin" /> : "QR so'rov yaratish"}
            </Button>
          </div>

          <div className="rounded-3xl border border-border bg-foreground p-5 text-background">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">QR orqali kelgan</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{formatUZS(total)}</p>
            <p className="mt-1 text-xs opacity-70">{paymentsQ.data?.count ?? 0} ta to'lov</p>
            <Link
              to="/barber/withdrawals"
              className="mt-3 inline-flex text-xs font-bold underline underline-offset-2 opacity-90"
            >
              Yechib olish →
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold">Qabul qilingan to'lovlar</h2>
          <button
            type="button"
            className="text-xs font-bold text-muted-foreground"
            onClick={() => void paymentsQ.refetch()}
          >
            Yangilash
          </button>
        </div>
        {paymentsQ.isLoading ? (
          <div className="mt-4 h-24 animate-pulse rounded-2xl bg-surface" />
        ) : payments.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Hali QR to'lov yo'q.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{p.payer_name || "Mijoz"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("uz-UZ")}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums",
                    p.status === "refunded" && "text-muted-foreground line-through",
                  )}
                >
                  +{formatUZS(Number(p.amount))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
