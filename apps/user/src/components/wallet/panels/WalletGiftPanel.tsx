import { useNavigate } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MysaloonLogo } from "@/components/brand/MysaloonLogo";
import {
  useGiftDesigns,
  useSendGift,
  useWalletBalance,
  useWalletRecipientSearch,
} from "@/hooks/use-wallet";
import { parseGiftDesignFee, type ApiGiftDesign } from "@/lib/api/wallet";
import { formatPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const MIN_GIFT = 5_000;
const MAX_GIFT = 1_000_000;

const GIFT_PRESETS = [
  { id: "p50", amount: 50_000, label: "50k" },
  { id: "p100", amount: 100_000, label: "100k" },
  { id: "p200", amount: 200_000, label: "200k" },
  { id: "p500", amount: 500_000, label: "500k" },
  { id: "p1000", amount: 1_000_000, label: "1000k" },
] as const;

function GiftCardPreview({
  design,
  amount,
  recipientLabel,
}: {
  design: ApiGiftDesign | undefined;
  amount: number;
  recipientLabel: string;
}) {
  const { t } = useTranslation();
  const from = design?.preview.from ?? "oklch(0.18 0 0)";
  const to = design?.preview.to ?? "oklch(0.32 0 0)";
  const accent = design?.preview.accent ?? "oklch(0.97 0.01 85)";

  return (
    <div
      className="relative overflow-hidden rounded-3xl px-5 py-6 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.45)]"
      style={{
        background: `linear-gradient(145deg, ${from}, ${to})`,
        color: accent,
      }}
    >
      <div className="flex items-center justify-between">
        <Gift className="h-5 w-5" style={{ color: accent }} />
        <MysaloonLogo size="xs" tone="inherit" className="opacity-70" />
      </div>
      <p className="mt-2 text-xs font-semibold opacity-70">
        {design?.name_uz || design?.name || t("walletPage.giftPanel.pickDesign", { defaultValue: "Dizayn" })}
      </p>
      <p className="mt-6 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(amount)}</p>
      <p className="mt-1 text-xs font-bold opacity-60">
        {recipientLabel || t("walletPage.giftPanel.recipientLabel", { defaultValue: "Sovg'a oluvchi" })}
      </p>
    </div>
  );
}

export function WalletGiftPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data: designs = [], isLoading: designsLoading } = useGiftDesigns();
  const [designId, setDesignId] = useState("");
  const [presetId, setPresetId] = useState<string | "custom">(GIFT_PRESETS[1].id);
  const [customAmount, setCustomAmount] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recipientUserId, setRecipientUserId] = useState<number | null>(null);
  const [recipientLabel, setRecipientLabel] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");

  const { balance } = useWalletBalance();
  const sendGift = useSendGift();
  const { data: recipients = [] } = useWalletRecipientSearch(debouncedQuery);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!designId && designs.length > 0) {
      setDesignId(designs[0].id);
    }
  }, [designId, designs]);

  const selectedDesign = designs.find((d) => d.id === designId);
  const designFee = selectedDesign ? parseGiftDesignFee(selectedDesign.fee) : 0;

  const giftAmount = useMemo(() => {
    if (presetId === "custom") {
      const n = Math.floor(Number(customAmount.replace(/\D/g, "")) || 0);
      return n;
    }
    return GIFT_PRESETS.find((g) => g.id === presetId)?.amount ?? 0;
  }, [presetId, customAmount]);

  const total = designFee + giftAmount;
  const giftInRange = giftAmount >= MIN_GIFT && giftAmount <= MAX_GIFT;
  const canAfford = balance >= total && total > 0;
  const hasRecipient = Boolean(recipientUserId) || query.trim().length >= 9;
  const canSend =
    Boolean(designId) && giftInRange && canAfford && hasRecipient && !sendGift.isPending;

  const balanceHint = useMemo(() => {
    if (!selectedDesign || giftAmount <= 0) return "";
    if (!giftInRange) {
      return t("walletPage.giftPanel.amountRange", {
        defaultValue: "Sovg'a {{min}} — {{max}} oralig'ida bo'lishi kerak.",
        min: formatPrice(MIN_GIFT),
        max: formatPrice(MAX_GIFT),
      });
    }
    if (canAfford) {
      return t("walletPage.giftPanel.balanceOk", {
        defaultValue: "Balans: {{amount}}",
        amount: formatPrice(balance),
      });
    }
    return t("walletPage.giftPanel.balanceLow", {
      defaultValue: "Balans yetarli emas. Kamida {{amount}} kerak.",
      amount: formatPrice(total),
    });
  }, [selectedDesign, giftAmount, giftInRange, canAfford, balance, total, t]);

  const pickRecipient = (r: (typeof recipients)[0]) => {
    setRecipientUserId(r.user_id);
    setRecipientLabel(r.full_name || r.phone || r.wallet_number);
    setQuery(r.full_name || r.phone || r.wallet_number);
  };

  const buildPayload = () => {
    if (!designId || !giftInRange) return null;
    const base = { design_id: designId, gift_amount: giftAmount, message: note };
    if (recipientUserId) {
      return { ...base, recipient_user_id: recipientUserId };
    }
    const q = query.trim();
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 16) {
      return { ...base, recipient_wallet_number: q };
    }
    if (digits.length >= 9) {
      return { ...base, recipient_phone: digits };
    }
    if (recipients.length === 1) {
      return { ...base, recipient_user_id: recipients[0].user_id };
    }
    return null;
  };

  const onSend = () => {
    const payload = buildPayload();
    if (!payload || !canAfford || !giftInRange) {
      if (!canAfford) {
        toast.error(
          t("walletPage.giftPanel.balanceLow", {
            defaultValue: "Balans yetarli emas. Kamida {{amount}} kerak.",
            amount: formatPrice(total),
          }),
        );
      } else if (!giftInRange) {
        toast.error(
          t("walletPage.giftPanel.amountRange", {
            defaultValue: "Sovg'a {{min}} — {{max}} oralig'ida bo'lishi kerak.",
            min: formatPrice(MIN_GIFT),
            max: formatPrice(MAX_GIFT),
          }),
        );
      } else {
        toast.error(t("walletPage.giftPanel.recipientRequired", { defaultValue: "Qabul qiluvchini tanlang." }));
      }
      return;
    }
    sendGift.mutate(payload, {
      onSuccess: () => {
        toast.success(t("walletPage.giftPanel.sent", { defaultValue: "Sovg'a yuborildi!" }));
        setStep("form");
        void navigate({ to: "/wallet", search: { section: "transactions" } });
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const onContinueToConfirm = () => {
    if (!canSend) {
      onSend();
      return;
    }
    setStep("confirm");
  };

  const designName = (d: ApiGiftDesign) =>
    i18n.language?.startsWith("uz") ? d.name_uz || d.name : d.name;

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      <div className="space-y-4 lg:sticky lg:top-20">
        <GiftCardPreview
          design={selectedDesign}
          amount={giftAmount > 0 ? giftAmount : MIN_GIFT}
          recipientLabel={recipientLabel}
        />
        <div className="rounded-2xl border border-border/70 bg-surface/40 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {t("walletPage.giftPanel.designFee", { defaultValue: "Dizayn" })}
            </span>
            <span className="font-semibold tabular-nums">{formatPrice(designFee)}</span>
          </div>
          <div className="mt-1.5 flex justify-between gap-3">
            <span className="text-muted-foreground">
              {t("walletPage.giftPanel.giftAmount", { defaultValue: "Sovg'a" })}
            </span>
            <span className="font-semibold tabular-nums">{formatPrice(giftAmount)}</span>
          </div>
          <div className="mt-2 flex justify-between gap-3 border-t border-border/60 pt-2">
            <span className="font-bold">
              {t("walletPage.giftPanel.total", { defaultValue: "Jami" })}
            </span>
            <span className="font-bold tabular-nums">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("walletPage.giftPanel.chooseDesign", { defaultValue: "Dizaynni tanlang" })}
          </h3>
          {designsLoading ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {designs.map((d) => {
                const active = designId === d.id;
                const fee = parseGiftDesignFee(d.fee);
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDesignId(d.id)}
                    className={cn(
                      "cursor-pointer overflow-hidden rounded-2xl border-2 p-0 text-left transition-all",
                      active ? "border-foreground" : "border-transparent opacity-90 hover:opacity-100",
                    )}
                  >
                    <div
                      className="h-12 w-full"
                      style={{
                        background: `linear-gradient(135deg, ${d.preview.from}, ${d.preview.to})`,
                      }}
                    />
                    <div className="bg-surface px-2.5 py-2">
                      <p className="truncate text-[11px] font-bold">{designName(d)}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                        {formatPrice(fee)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("walletPage.giftPanel.chooseAmount", { defaultValue: "Summani tanlang" })}
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {GIFT_PRESETS.map((g) => {
              const active = presetId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setPresetId(g.id)}
                  className={cn(
                    "cursor-pointer rounded-2xl p-3 text-left transition-all",
                    active
                      ? "bg-foreground text-background"
                      : "bg-surface text-foreground active:scale-[0.98]",
                  )}
                >
                  <p className="text-sm font-bold">{g.label}</p>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setPresetId("custom")}
            className={cn(
              "mt-2 w-full cursor-pointer rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors",
              presetId === "custom" ? "bg-foreground text-background" : "bg-surface",
            )}
          >
            {t("walletPage.giftPanel.customAmount", { defaultValue: "Boshqa summa" })}
          </button>
          {presetId === "custom" ? (
            <input
              type="text"
              inputMode="numeric"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={`${MIN_GIFT.toLocaleString("uz-UZ")} — ${MAX_GIFT.toLocaleString("uz-UZ")}`}
              className="mt-2 w-full rounded-2xl bg-surface px-4 py-3.5 text-sm font-bold tabular-nums placeholder:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          ) : null}
          {balanceHint ? (
            <p
              className={cn(
                "mt-2 text-[11px] font-semibold",
                canAfford && giftInRange ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {balanceHint}
            </p>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("walletPage.giftPanel.recipientField", { defaultValue: "Kimga" })}
            </label>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setRecipientUserId(null);
                setRecipientLabel("");
              }}
              placeholder={t("walletPage.giftPanel.recipientPlaceholder", {
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
                      className="flex w-full cursor-pointer flex-col items-start px-4 py-3 text-left active:bg-surface"
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
              {t("walletPage.giftPanel.noteField", { defaultValue: "Tabriknoma" })}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t("walletPage.giftPanel.notePlaceholder", { defaultValue: "Sovg'aga qisqa xabar" })}
              className="mt-2 w-full resize-none rounded-2xl bg-surface px-4 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            />
          </div>
        </section>

        <button
          type="button"
          disabled={!canSend}
          onClick={onContinueToConfirm}
          className="w-full cursor-pointer rounded-2xl bg-foreground py-4 text-sm font-bold text-background transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("walletPage.giftPanel.review", { defaultValue: "Tekshirib yuborish" })}
        </button>
      </div>

      {step === "confirm" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[28px] bg-background p-5 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("walletPage.giftPanel.confirmTitle", { defaultValue: "2-bosqich · tasdiqlash" })}
            </p>
            <h3 className="mt-2 text-lg font-bold">
              {t("walletPage.giftPanel.confirmHeading", { defaultValue: "Sovg'ani yuborasizmi?" })}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("walletPage.giftPanel.confirmHint", {
                defaultValue: "Tekshiruv → dizayn to'lovi → yechish → kirim → ledger muhri",
              })}
            </p>
            <ul className="mt-4 space-y-2 rounded-2xl bg-surface px-4 py-3 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Qabul qiluvchi</span>
                <span className="font-semibold text-right">{recipientLabel || query || "—"}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Dizayn</span>
                <span className="font-semibold">{selectedDesign ? designName(selectedDesign) : "—"}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Sovg'a</span>
                <span className="font-semibold tabular-nums">{formatPrice(giftAmount)}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">Dizayn to'lovi</span>
                <span className="font-semibold tabular-nums">{formatPrice(designFee)}</span>
              </li>
              <li className="flex justify-between gap-3 border-t border-border/60 pt-2 font-bold">
                <span>Jami</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </li>
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={sendGift.isPending}
                className="rounded-2xl bg-surface py-3.5 text-sm font-bold"
              >
                {t("common.back", { defaultValue: "Orqaga" })}
              </button>
              <button
                type="button"
                disabled={sendGift.isPending}
                onClick={onSend}
                className="rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-40"
              >
                {sendGift.isPending
                  ? t("walletPage.giftPanel.sending", { defaultValue: "Yuborilmoqda…" })
                  : t("walletPage.giftPanel.confirmSend", { defaultValue: "Tasdiqlash" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
