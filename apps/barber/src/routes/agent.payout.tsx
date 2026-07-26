import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  agentApiJson,
  formatUzs,
  type AgentWalletPayload,
} from "@/lib/agent-api";

export const Route = createFileRoute("/agent/payout")({
  component: AgentPayoutPage,
});

function AgentPayoutPage() {
  const qc = useQueryClient();
  const walletQ = useQuery({
    queryKey: ["agent", "wallet"],
    queryFn: () => agentApiJson<AgentWalletPayload>("/api/v1/agent/wallet/"),
  });
  const d = walletQ.data;
  const [amount, setAmount] = useState("");
  const [holder, setHolder] = useState("");
  const [bank, setBank] = useState("");
  const [card, setCard] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      agentApiJson("/api/v1/agent/payouts/request/", {
        method: "POST",
        body: JSON.stringify({
          amount: Number(amount),
          holder_name: holder,
          bank_name: bank,
          card_last4: card.slice(-4),
        }),
      }),
    onSuccess: () => {
      toast.success("Payout so'rovi yuborildi");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["agent", "wallet"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Payout</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Komissiya hamyoningizdan yechib, admin to&apos;lovini kuting. Minimal:{" "}
          {formatUzs(d?.min_payout_uzs ?? 50000)}.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-card p-5">
        <p className="text-xs text-muted-foreground">Mavjud balans</p>
        <p className="font-heading text-3xl font-semibold mt-1">
          {formatUzs(d?.balance ?? 0)}
        </p>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          Hisob: {d?.account_number ?? "—"}
        </p>
      </div>

      <form
        className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mut.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Summa (so&apos;m)</Label>
          <Input
            type="number"
            min={d?.min_payout_uzs ?? 50000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Karta egasi</Label>
          <Input value={holder} onChange={(e) => setHolder(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>Bank</Label>
          <Input value={bank} onChange={(e) => setBank(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Karta (oxirgi 4 raqam)</Label>
          <Input
            value={card}
            onChange={(e) => setCard(e.target.value)}
            maxLength={4}
            inputMode="numeric"
          />
        </div>
        <Button type="submit" className="w-full" disabled={mut.isPending}>
          {mut.isPending ? "Yuborilmoqda…" : "Payout so'rash"}
        </Button>
      </form>

      <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-heading font-semibold">So&apos;rovlar</h2>
        </div>
        {(d?.payouts ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Hali yo&apos;q</div>
        ) : (
          <ul className="divide-y divide-border">
            {d!.payouts.map((p) => (
              <li key={p.id} className="px-5 py-3 flex justify-between text-sm gap-3">
                <div>
                  <p className="font-medium">{formatUzs(p.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.holder_name || "—"} · {p.status}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(p.created_at), "dd MMM HH:mm", { locale: uz })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
