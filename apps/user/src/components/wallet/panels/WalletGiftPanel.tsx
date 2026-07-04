import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSendGift, useWalletBalance, useWalletRecipientSearch } from "@/hooks/use-wallet";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const GIFT_PRESETS = [
  { id: "g1", amount: 200_000, label: "Mini" },
  { id: "g2", amount: 500_000, label: "Standart" },
  { id: "g3", amount: 1_000_000, label: "Premium" },
] as const;

export function WalletGiftPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(GIFT_PRESETS[1].id);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recipientUserId, setRecipientUserId] = useState<number | null>(null);
  const [recipientLabel, setRecipientLabel] = useState("");
  const [note, setNote] = useState("");

  const { balance } = useWalletBalance();
  const sendGift = useSendGift();
  const { data: recipients = [] } = useWalletRecipientSearch(debouncedQuery);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const amount = GIFT_PRESETS.find((g) => g.id === selectedId)?.amount ?? 0;
  const canAfford = balance >= amount;
  const canSend =
    (Boolean(recipientUserId) || query.trim().length >= 9) &&
    amount >= 10_000 &&
    canAfford &&
    !sendGift.isPending;

  const balanceHint = useMemo(() => {
    if (amount <= 0) return "";
    if (canAfford) {
      return t("walletPage.gift.balanceOk", {
        defaultValue: "Balans: {{amount}}",
        amount: formatPrice(balance),
      });
    }
    return t("walletPage.gift.balanceLow", {
      defaultValue: "Balans yetarli emas. Kamida {{amount}} kerak.",
      amount: formatPrice(amount),
    });
  }, [amount, balance, canAfford, t]);

  const pickRecipient = (r: (typeof recipients)[0]) => {
    setRecipientUserId(r.user_id);
    setRecipientLabel(r.full_name || r.phone || r.wallet_number);
    setQuery(r.full_name || r.phone || r.wallet_number);
  };

  const buildPayload = () => {
    if (recipientUserId) {
      return { amount, message: note, recipient_user_id: recipientUserId };
    }
    const q = query.trim();
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 16) {
      return { amount, message: note, recipient_wallet_number: q };
    }
    if (digits.length >= 9) {
      return { amount, message: note, recipient_phone: digits };
    }
    if (recipients.length === 1) {
      return { amount, message: note, recipient_user_id: recipients[0].user_id };
    }
    return null;
  };

  const onSend = () => {
    const payload = buildPayload();
    if (!payload || !canAfford || amount < 10_000) {
      if (!canAfford) {
        toast.error(
          t("walletPage.gift.balanceLow", {
            defaultValue: "Balans yetarli emas. Kamida {{amount}} kerak.",
            amount: formatPrice(amount),
          }),
        );
      } else {
        toast.error(t("walletPage.gift.recipientRequired", { defaultValue: "Qabul qiluvchini tanlang." }));
      }
      return;
    }
    sendGift.mutate(payload, {
      onSuccess: () => {
        toast.success(t("walletPage.gift.sent", { defaultValue: "Sovg'a yuborildi!" }));
        void navigate({ to: "/wallet", search: { section: "transactions" } });
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="overflow-hidden rounded-3xl bg-foreground px-5 py-6 text-background lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <Gift className="h-5 w-5" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-background/60">mysaloon.uz</p>
        </div>
        <p className="mt-8 text-3xl font-bold tracking-tight">{formatPrice(amount)}</p>
        <p className="mt-1 text-xs font-bold text-background/60">
          {recipientLabel || t("walletPage.gift.recipientLabel", { defaultValue: "Sovg'a oluvchi" })}
        </p>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("walletPage.gift.chooseAmount", { defaultValue: "Summani tanlang" })}
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {GIFT_PRESETS.map((g) => {
              const active = selectedId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedId(g.id)}
                  className={cn(
                    "rounded-2xl p-3 text-left transition-all",
                    active
                      ? "bg-foreground text-background"
                      : "bg-surface text-foreground active:scale-[0.98]",
                  )}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{g.label}</p>
                  <p className="mt-1 text-sm font-bold">{Math.round(g.amount / 1000)}k</p>
                </button>
              );
            })}
          </div>
          {balanceHint ? (
            <p
              className={cn(
                "mt-2 text-[11px] font-semibold",
                canAfford ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {balanceHint}
            </p>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("walletPage.gift.recipientField", { defaultValue: "Kimga" })}
            </label>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setRecipientUserId(null);
                setRecipientLabel("");
              }}
              placeholder={t("walletPage.gift.recipientPlaceholder", {
                defaultValue: "Ism, telefon yoki hamyon raqami",
              })}
              className="mt-2 w-full rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            />
            {recipients.length > 0 && !recipientUserId ? (
              <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-2xl bg-background shadow-lg ring-1 ring-border">
                {recipients.map((r) => (
                  <li key={r.user_id}>
                    <button
                      type="button"
                      onClick={() => pickRecipient(r)}
                      className="flex w-full flex-col items-start px-4 py-3 text-left active:bg-surface"
                    >
                      <span className="text-sm font-bold">{r.full_name || "Foydalanuvchi"}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {r.phone ? `${r.phone} · ` : ""}
                        {r.wallet_number}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("walletPage.gift.noteField", { defaultValue: "Tabriknoma" })}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t("walletPage.gift.notePlaceholder", { defaultValue: "Sovg'aga qisqa xabar" })}
              className="mt-2 w-full resize-none rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </div>
        </section>

        <button
          type="button"
          disabled={!canSend}
          onClick={onSend}
          className="w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sendGift.isPending
            ? t("walletPage.gift.sending", { defaultValue: "Yuborilmoqda…" })
            : t("walletPage.gift.send", { defaultValue: "Sovg'ani yuborish" })}
        </button>
      </div>
    </div>
  );
}
