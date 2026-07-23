import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Cake,
  Check,
  Gift,
  Heart,
  PartyPopper,
  Search,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
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
  { id: "p1000", amount: 1_000_000, label: "1M" },
] as const;

const OCCASIONS = [
  {
    id: "birthday",
    icon: Cake,
    labelKey: "walletPage.giftPanel.occasion.birthday",
    defaultLabel: "Tug'ilgan kun",
    messageKey: "walletPage.giftPanel.templates.birthday",
    defaultMessage: "Tug'ilgan kuningiz bilan! Sizga baxt va go'zallik tilayman.",
  },
  {
    id: "thanks",
    icon: Heart,
    labelKey: "walletPage.giftPanel.occasion.thanks",
    defaultLabel: "Rahmat",
    messageKey: "walletPage.giftPanel.templates.thanks",
    defaultMessage: "Rahmat! Kichik sovg'a — katta minnatdorchilik belgisi.",
  },
  {
    id: "holiday",
    icon: PartyPopper,
    labelKey: "walletPage.giftPanel.occasion.holiday",
    defaultLabel: "Bayram",
    messageKey: "walletPage.giftPanel.templates.holiday",
    defaultMessage: "Bayramingiz muborak! Omad va quvonch tilayman.",
  },
  {
    id: "treat",
    icon: Sparkles,
    labelKey: "walletPage.giftPanel.occasion.treat",
    defaultLabel: "O'zingizga",
    messageKey: "walletPage.giftPanel.templates.treat",
    defaultMessage: "O'zingizga chiroyli kun — salonda dam oling!",
  },
] as const;

function GiftCardPreview({
  design,
  amount,
  recipientLabel,
  note,
  occasionLabel,
}: {
  design: ApiGiftDesign | undefined;
  amount: number;
  recipientLabel: string;
  note: string;
  occasionLabel?: string;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const from = design?.preview.from ?? "oklch(0.18 0 0)";
  const to = design?.preview.to ?? "oklch(0.32 0 0)";
  const accent = design?.preview.accent ?? "oklch(0.97 0.01 85)";
  const designKey = design?.id ?? "none";

  return (
    <div className="relative" style={{ perspective: 1200 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={designKey}
          initial={reduced ? false : { opacity: 0.35, rotateY: -12, scale: 0.97 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0.2, rotateY: 10, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[28px] px-5 py-6 shadow-[0_24px_56px_-28px_rgba(0,0,0,0.5)]"
          style={{
            background: `linear-gradient(145deg, ${from}, ${to})`,
            color: accent,
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-30"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-6 h-28 w-28 rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
            aria-hidden
          />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                <Gift className="h-4 w-4" style={{ color: accent }} />
              </span>
              {occasionLabel ? (
                <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold tracking-wide opacity-90">
                  {occasionLabel}
                </span>
              ) : null}
            </div>
            <MysaloonLogo size="xs" tone="inherit" className="opacity-75" />
          </div>

          <p className="relative mt-5 text-[11px] font-semibold tracking-[0.14em] uppercase opacity-65">
            {design?.name_uz ||
              design?.name ||
              t("walletPage.giftPanel.pickDesign", { defaultValue: "Dizayn" })}
          </p>
          <motion.p
            key={amount}
            initial={reduced ? false : { opacity: 0.5, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mt-2 text-[2rem] font-bold tracking-tight tabular-nums leading-none"
          >
            {formatPrice(amount)}
          </motion.p>

          <div className="relative mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-50">
                {t("walletPage.giftPanel.forLabel", { defaultValue: "Kimga" })}
              </p>
              <p className="mt-0.5 truncate text-sm font-bold opacity-90">
                {recipientLabel ||
                  t("walletPage.giftPanel.recipientLabel", { defaultValue: "Sovg'a oluvchi" })}
              </p>
            </div>
            {note.trim() ? (
              <p className="max-w-[48%] truncate text-right text-[11px] font-medium italic opacity-55">
                “{note.trim()}”
              </p>
            ) : null}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SectionLabel({
  step,
  children,
  htmlFor,
}: {
  step?: number;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
    >
      {step != null ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background tabular-nums">
          {step}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export function WalletGiftPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const recipientInputId = useId();
  const amountInputId = useId();
  const noteInputId = useId();
  const reduced = useReducedMotion();

  const { data: designs = [], isLoading: designsLoading } = useGiftDesigns();
  const [designId, setDesignId] = useState("");
  const [presetId, setPresetId] = useState<string | "custom">(GIFT_PRESETS[1].id);
  const [customAmount, setCustomAmount] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recipientUserId, setRecipientUserId] = useState<number | null>(null);
  const [recipientLabel, setRecipientLabel] = useState("");
  const [note, setNote] = useState("");
  const [occasionId, setOccasionId] = useState<string | null>(null);
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
  const selectedOccasion = OCCASIONS.find((o) => o.id === occasionId);

  const giftAmount = useMemo(() => {
    if (presetId === "custom") {
      return Math.floor(Number(customAmount.replace(/\D/g, "")) || 0);
    }
    return GIFT_PRESETS.find((g) => g.id === presetId)?.amount ?? 0;
  }, [presetId, customAmount]);

  const total = designFee + giftAmount;
  const remaining = balance - total;
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
      return t("walletPage.giftPanel.balanceAfter", {
        defaultValue: "Yuborgandan keyin: {{amount}}",
        amount: formatPrice(Math.max(0, remaining)),
      });
    }
    return t("walletPage.giftPanel.balanceLow", {
      defaultValue: "Balans yetarli emas. Kamida {{amount}} kerak.",
      amount: formatPrice(total),
    });
  }, [selectedDesign, giftAmount, giftInRange, canAfford, remaining, total, t]);

  const pickRecipient = (r: (typeof recipients)[0]) => {
    setRecipientUserId(r.user_id);
    setRecipientLabel(r.full_name || r.phone || r.wallet_number);
    setQuery(r.full_name || r.phone || r.wallet_number);
  };

  const clearRecipient = () => {
    setRecipientUserId(null);
    setRecipientLabel("");
    setQuery("");
  };

  const applyOccasion = (id: string) => {
    const occ = OCCASIONS.find((o) => o.id === id);
    if (!occ) return;
    if (occasionId === id) {
      setOccasionId(null);
      return;
    }
    setOccasionId(id);
    setNote(t(occ.messageKey, { defaultValue: occ.defaultMessage }).slice(0, 500));
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
        toast.error(
          t("walletPage.giftPanel.recipientRequired", { defaultValue: "Qabul qiluvchini tanlang." }),
        );
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

  const selectPreset = (id: (typeof GIFT_PRESETS)[number]["id"]) => {
    setPresetId(id);
    setCustomAmount("");
  };

  const formatAmountInput = (digits: string) => {
    const n = digits.replace(/\D/g, "");
    if (!n) return "";
    return Number(n).toLocaleString("uz-UZ");
  };

  const onCustomAmountChange = (value: string) => {
    setPresetId("custom");
    setCustomAmount(formatAmountInput(value));
  };

  const occasionLabel = selectedOccasion
    ? t(selectedOccasion.labelKey, { defaultValue: selectedOccasion.defaultLabel })
    : undefined;

  return (
    <div className="relative pb-24 lg:pb-0">
      <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-8">
        {/* Preview column */}
        <div className="space-y-3 lg:sticky lg:top-20">
          <GiftCardPreview
            design={selectedDesign}
            amount={giftAmount > 0 ? giftAmount : MIN_GIFT}
            recipientLabel={recipientLabel}
            note={note}
            occasionLabel={occasionLabel}
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-surface/70 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("walletPage.giftPanel.designFee", { defaultValue: "Dizayn" })}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{formatPrice(designFee)}</p>
            </div>
            <div className="rounded-2xl bg-surface/70 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {t("walletPage.giftPanel.giftAmount", { defaultValue: "Sovg'a" })}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{formatPrice(giftAmount)}</p>
            </div>
            <div className="rounded-2xl bg-foreground px-3 py-2.5 text-background">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] opacity-70">
                {t("walletPage.giftPanel.total", { defaultValue: "Jami" })}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums">{formatPrice(total)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-surface/40 px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t("walletPage.giftPanel.balanceOk", {
                defaultValue: "Balans: {{amount}}",
                amount: formatPrice(balance),
              })}
            </span>
          </div>
        </div>

        {/* Form column */}
        <div className="space-y-5">
          {/* 1. Recipient */}
          <section className="rounded-[24px] border border-border/50 bg-surface/30 p-4">
            <SectionLabel step={1} htmlFor={recipientInputId}>
              {t("walletPage.giftPanel.recipientField", { defaultValue: "Kimga" })}
            </SectionLabel>

            {recipientUserId && recipientLabel ? (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-background px-3 py-3 ring-1 ring-border/70">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{recipientLabel}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("walletPage.giftPanel.recipientSelected", {
                      defaultValue: "Tanlandi — o'zgartirish mumkin",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearRecipient}
                  className="cursor-pointer rounded-xl bg-surface px-3 py-2 text-xs font-bold transition-colors hover:bg-surface/80"
                >
                  {t("common.change", { defaultValue: "Almashtirish" })}
                </button>
              </div>
            ) : (
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id={recipientInputId}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setRecipientUserId(null);
                    setRecipientLabel("");
                  }}
                  placeholder={t("walletPage.giftPanel.recipientPlaceholder", {
                    defaultValue: "Ism, telefon yoki hamyon raqami",
                  })}
                  className="w-full rounded-2xl bg-background py-3.5 pl-10 pr-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                  autoComplete="off"
                />
                {recipients.length > 0 && !recipientUserId ? (
                  <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-2xl bg-background shadow-lg ring-1 ring-border">
                    {recipients.map((r) => (
                      <li key={r.user_id}>
                        <button
                          type="button"
                          onClick={() => pickRecipient(r)}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface active:bg-surface"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {r.full_name || "Foydalanuvchi"}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {r.phone ? `${r.phone} · ` : ""}
                              {r.wallet_number}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </section>

          {/* 2. Amount */}
          <section className="rounded-[24px] border border-border/50 bg-surface/30 p-4">
            <SectionLabel step={2} htmlFor={amountInputId}>
              {t("walletPage.giftPanel.chooseAmount", { defaultValue: "Summani tanlang" })}
            </SectionLabel>

            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
              {formatPrice(giftAmount > 0 ? giftAmount : 0)}
            </p>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {GIFT_PRESETS.map((g) => {
                const active = presetId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selectPreset(g.id)}
                    className={cn(
                      "shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-bold transition-colors duration-200",
                      active
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground ring-1 ring-border/70 hover:bg-surface",
                    )}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-3">
              <input
                id={amountInputId}
                type="text"
                inputMode="numeric"
                value={
                  presetId === "custom"
                    ? customAmount
                    : giftAmount > 0
                      ? giftAmount.toLocaleString("uz-UZ")
                      : ""
                }
                onChange={(e) => onCustomAmountChange(e.target.value)}
                onFocus={() => {
                  if (presetId !== "custom") {
                    setPresetId("custom");
                    setCustomAmount(giftAmount > 0 ? giftAmount.toLocaleString("uz-UZ") : "");
                  }
                }}
                placeholder={t("walletPage.giftPanel.customAmountHint", {
                  defaultValue: "Yoki o'zingiz yozing…",
                })}
                className="w-full rounded-2xl bg-background px-4 py-3.5 text-sm font-bold tabular-nums placeholder:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
              />
            </div>

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

          {/* 3. Design carousel */}
          <section>
            <SectionLabel step={3}>
              {t("walletPage.giftPanel.chooseDesign", { defaultValue: "Dizaynni tanlang" })}
            </SectionLabel>

            {designsLoading ? (
              <div className="mt-3 flex gap-3 overflow-hidden">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[7.5rem] w-[7.25rem] shrink-0 animate-pulse rounded-[22px] bg-surface" />
                ))}
              </div>
            ) : (
              <div className="mt-3 -mx-1 flex gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {designs.map((d) => {
                  const active = designId === d.id;
                  const fee = parseGiftDesignFee(d.fee);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDesignId(d.id)}
                      className={cn(
                        "group relative w-[7.25rem] shrink-0 cursor-pointer snap-start overflow-hidden rounded-[22px] border-2 text-left transition-all duration-200",
                        active
                          ? "border-foreground shadow-[0_12px_28px_-18px_rgba(0,0,0,0.45)]"
                          : "border-transparent opacity-90 hover:opacity-100",
                      )}
                    >
                      <div
                        className="relative h-16 w-full"
                        style={{
                          background: `linear-gradient(135deg, ${d.preview.from}, ${d.preview.to})`,
                        }}
                      >
                        {active ? (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        ) : null}
                      </div>
                      <div className="bg-surface px-2.5 py-2.5">
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

          {/* 4. Occasion + note */}
          <section className="rounded-[24px] border border-border/50 bg-surface/30 p-4">
            <SectionLabel step={4} htmlFor={noteInputId}>
              {t("walletPage.giftPanel.noteField", { defaultValue: "Tabriknoma" })}
            </SectionLabel>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {OCCASIONS.map((occ) => {
                const Icon = occ.icon;
                const active = occasionId === occ.id;
                return (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => applyOccasion(occ.id)}
                    className={cn(
                      "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors duration-200",
                      active
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground ring-1 ring-border/70 hover:bg-surface",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(occ.labelKey, { defaultValue: occ.defaultLabel })}
                  </button>
                );
              })}
            </div>

            <textarea
              id={noteInputId}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={3}
              placeholder={t("walletPage.giftPanel.notePlaceholder", {
                defaultValue: "Sovg'aga qisqa xabar",
              })}
              className="mt-3 w-full resize-none rounded-2xl bg-background px-4 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            />
            <p className="mt-1.5 text-right text-[10px] font-semibold tabular-nums text-muted-foreground">
              {note.length}/500
            </p>
          </section>

          {/* Desktop CTA */}
          <button
            type="button"
            disabled={!canSend}
            onClick={onContinueToConfirm}
            className="hidden w-full cursor-pointer rounded-2xl bg-foreground py-4 text-sm font-bold text-background transition-transform duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 lg:block"
          >
            {t("walletPage.giftPanel.review", { defaultValue: "Tekshirib yuborish" })}
          </button>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <motion.div
        initial={reduced ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-4 lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3 rounded-[22px] bg-foreground p-2 pl-4 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.55)]">
          <div className="min-w-0 flex-1 text-background">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-65">
              {t("walletPage.giftPanel.total", { defaultValue: "Jami" })}
            </p>
            <p className="truncate text-base font-bold tabular-nums">{formatPrice(total)}</p>
          </div>
          <button
            type="button"
            disabled={!canSend}
            onClick={onContinueToConfirm}
            className="cursor-pointer shrink-0 rounded-[16px] bg-background px-5 py-3.5 text-sm font-bold text-foreground transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("walletPage.giftPanel.reviewShort", { defaultValue: "Yuborish" })}
          </button>
        </div>
      </motion.div>

      {/* Confirm sheet */}
      {step === "confirm" ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="presentation"
          onClick={() => !sendGift.isPending && setStep("form")}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-confirm-heading"
            initial={reduced ? false : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-[28px] bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("walletPage.giftPanel.confirmTitle", { defaultValue: "2-bosqich · tasdiqlash" })}
            </p>
            <h3 id="gift-confirm-heading" className="mt-2 text-lg font-bold">
              {t("walletPage.giftPanel.confirmHeading", { defaultValue: "Sovg'ani yuborasizmi?" })}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("walletPage.giftPanel.confirmHint", {
                defaultValue: "Tekshiruv → dizayn to'lovi → yechish → kirim → ledger muhri",
              })}
            </p>

            <div className="mt-4 overflow-hidden rounded-2xl">
              <GiftCardPreview
                design={selectedDesign}
                amount={giftAmount}
                recipientLabel={recipientLabel || query}
                note={note}
                occasionLabel={occasionLabel}
              />
            </div>

            <ul className="mt-3 space-y-2 rounded-2xl bg-surface px-4 py-3 text-sm">
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("walletPage.giftPanel.recipientField", { defaultValue: "Kimga" })}
                </span>
                <span className="max-w-[60%] truncate text-right font-semibold">
                  {recipientLabel || query || "—"}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("walletPage.giftPanel.designFee", { defaultValue: "Dizayn" })}
                </span>
                <span className="font-semibold">
                  {selectedDesign ? designName(selectedDesign) : "—"} · {formatPrice(designFee)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {t("walletPage.giftPanel.giftAmount", { defaultValue: "Sovg'a" })}
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(giftAmount)}</span>
              </li>
              <li className="flex justify-between gap-3 border-t border-border/60 pt-2 font-bold">
                <span>{t("walletPage.giftPanel.total", { defaultValue: "Jami" })}</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </li>
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={sendGift.isPending}
                className="cursor-pointer rounded-2xl bg-surface py-3.5 text-sm font-bold transition-colors hover:bg-surface/80"
              >
                {t("common.back", { defaultValue: "Orqaga" })}
              </button>
              <button
                type="button"
                disabled={sendGift.isPending}
                onClick={onSend}
                className="cursor-pointer rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-40"
              >
                {sendGift.isPending
                  ? t("walletPage.giftPanel.sending", { defaultValue: "Yuborilmoqda…" })
                  : t("walletPage.giftPanel.confirmSend", { defaultValue: "Tasdiqlash" })}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
