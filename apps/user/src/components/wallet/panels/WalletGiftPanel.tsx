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
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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

function formatAmountInput(value: string) {
  const n = value.replace(/\D/g, "");
  if (!n) return "";
  return Number(n).toLocaleString("uz-UZ");
}

function GiftCardPreview({
  design,
  amount,
  recipientLabel,
  note,
  occasionLabel,
  compact = false,
}: {
  design: ApiGiftDesign | undefined;
  amount: number;
  recipientLabel: string;
  note: string;
  occasionLabel?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const from = design?.preview.from ?? "oklch(0.18 0 0)";
  const to = design?.preview.to ?? "oklch(0.32 0 0)";
  const accent = design?.preview.accent ?? "oklch(0.97 0.01 85)";
  const designKey = design?.id ?? "none";

  return (
    <div className="relative" style={{ perspective: 1400 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={designKey}
          initial={reduced ? false : { opacity: 0.4, rotateY: -14, scale: 0.96 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0.25, rotateY: 12, scale: 0.97 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "relative aspect-[1.68/1] overflow-hidden rounded-[26px] shadow-[0_28px_64px_-30px_rgba(0,0,0,0.55)]",
            compact ? "px-4 py-4" : "px-5 py-5",
          )}
          style={{
            background: `linear-gradient(148deg, ${from}, ${to})`,
            color: accent,
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 20%, currentColor 0.6px, transparent 0.7px), radial-gradient(circle at 82% 70%, currentColor 0.5px, transparent 0.6px)",
              backgroundSize: "18px 18px, 22px 22px",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${accent}, transparent 68%)` }}
            aria-hidden
          />

          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/12 backdrop-blur-sm">
                  <Gift className="h-3.5 w-3.5" />
                </span>
                {occasionLabel ? (
                  <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold tracking-wide">
                    {occasionLabel}
                  </span>
                ) : null}
              </div>
              <MysaloonLogo size="xs" tone="inherit" className="opacity-80" />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-60">
                {design?.name_uz ||
                  design?.name ||
                  t("walletPage.giftPanel.pickDesign", { defaultValue: "Dizayn" })}
              </p>
              <motion.p
                key={amount}
                initial={reduced ? false : { opacity: 0.45, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className={cn(
                  "mt-1 font-bold tracking-tight tabular-nums leading-none",
                  compact ? "text-2xl" : "text-[1.85rem] sm:text-[2.1rem]",
                )}
              >
                {formatPrice(amount)}
              </motion.p>
            </div>

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-45">
                  {t("walletPage.giftPanel.forLabel", { defaultValue: "Kimga" })}
                </p>
                <p className="mt-0.5 truncate text-sm font-bold">
                  {recipientLabel ||
                    t("walletPage.giftPanel.recipientLabel", { defaultValue: "Sovg'a oluvchi" })}
                </p>
              </div>
              {note.trim() ? (
                <p className="max-w-[46%] truncate text-right text-[10px] font-medium italic opacity-55">
                  “{note.trim()}”
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepRail({
  doneRecipient,
  doneAmount,
  doneDesign,
}: {
  doneRecipient: boolean;
  doneAmount: boolean;
  doneDesign: boolean;
}) {
  const { t } = useTranslation();
  const items = [
    {
      done: doneRecipient,
      label: t("walletPage.giftPanel.recipientField", { defaultValue: "Kimga" }),
    },
    {
      done: doneAmount,
      label: t("walletPage.giftPanel.giftAmount", { defaultValue: "Summa" }),
    },
    {
      done: doneDesign,
      label: t("walletPage.giftPanel.designFee", { defaultValue: "Dizayn" }),
    },
  ];

  return (
    <div className="flex items-center gap-1.5" role="list" aria-label="Progress">
      {items.map((item, i) => (
        <div key={item.label} className="flex min-w-0 flex-1 items-center gap-1.5" role="listitem">
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-200",
              item.done
                ? "bg-foreground text-background"
                : "bg-surface text-muted-foreground ring-1 ring-border/70",
            )}
          >
            {item.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
          </div>
          <span
            className={cn(
              "truncate text-[10px] font-bold uppercase tracking-[0.12em]",
              item.done ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {item.label}
          </span>
          {i < items.length - 1 ? (
            <span
              className={cn(
                "mx-0.5 h-px min-w-[10px] flex-1",
                item.done ? "bg-foreground/35" : "bg-border",
              )}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function WalletGiftPanel() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const recipientInputId = useId();
  const amountInputId = useId();
  const noteInputId = useId();
  const reduced = useReducedMotion();
  const designScrollerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!designId || !designScrollerRef.current) return;
    const el = designScrollerRef.current.querySelector<HTMLElement>(`[data-design-id="${designId}"]`);
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", inline: "center", block: "nearest" });
  }, [designId, reduced]);

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

  const missingHint = useMemo(() => {
    if (!hasRecipient) {
      return t("walletPage.giftPanel.recipientRequired", { defaultValue: "Qabul qiluvchini tanlang." });
    }
    if (!giftInRange) {
      return t("walletPage.giftPanel.amountRange", {
        defaultValue: "Sovg'a {{min}} — {{max}} oralig'ida bo'lishi kerak.",
        min: formatPrice(MIN_GIFT),
        max: formatPrice(MAX_GIFT),
      });
    }
    if (!canAfford) {
      return t("walletPage.giftPanel.balanceLow", {
        defaultValue: "Balans yetarli emas. Kamida {{amount}} kerak.",
        amount: formatPrice(total),
      });
    }
    return t("walletPage.giftPanel.balanceAfter", {
      defaultValue: "Yuborgandan keyin: {{amount}}",
      amount: formatPrice(Math.max(0, remaining)),
    });
  }, [hasRecipient, giftInRange, canAfford, remaining, total, t]);

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

  const occasionLabel = selectedOccasion
    ? t(selectedOccasion.labelKey, { defaultValue: selectedOccasion.defaultLabel })
    : undefined;

  const amountFieldValue =
    presetId === "custom"
      ? customAmount
      : giftAmount > 0
        ? giftAmount.toLocaleString("uz-UZ")
        : "";

  return (
    <div className="relative pb-[7.5rem] lg:pb-0">
      <div className="mx-auto max-w-lg space-y-6 lg:mx-0 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start lg:gap-10 lg:space-y-0">
        {/* Visual column */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <StepRail
            doneRecipient={hasRecipient}
            doneAmount={giftInRange}
            doneDesign={Boolean(designId)}
          />

          <div className="relative">
            <div
              className="pointer-events-none absolute inset-x-6 -bottom-3 top-8 rounded-[32px] opacity-50 blur-2xl"
              style={{
                background: selectedDesign
                  ? `linear-gradient(180deg, ${selectedDesign.preview.from}, transparent)`
                  : "transparent",
              }}
              aria-hidden
            />
            <GiftCardPreview
              design={selectedDesign}
              amount={giftAmount > 0 ? giftAmount : MIN_GIFT}
              recipientLabel={recipientLabel}
              note={note}
              occasionLabel={occasionLabel}
            />
          </div>

          {/* Design picker — under card, immediate visual link */}
          <div>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {t("walletPage.giftPanel.chooseDesign", { defaultValue: "Dizaynni tanlang" })}
              </p>
              {selectedDesign ? (
                <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {designName(selectedDesign)} · {formatPrice(designFee)}
                </p>
              ) : null}
            </div>

            {designsLoading ? (
              <div className="flex gap-2.5 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[4.5rem] w-[4.5rem] shrink-0 animate-pulse rounded-2xl bg-surface" />
                ))}
              </div>
            ) : (
              <div
                ref={designScrollerRef}
                className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {designs.map((d) => {
                  const active = designId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      data-design-id={d.id}
                      onClick={() => setDesignId(d.id)}
                      aria-pressed={active}
                      aria-label={designName(d)}
                      className={cn(
                        "relative h-[4.5rem] w-[4.5rem] shrink-0 cursor-pointer snap-center overflow-hidden rounded-2xl transition-all duration-200",
                        active
                          ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                          : "opacity-80 hover:opacity-100",
                      )}
                      style={{
                        background: `linear-gradient(145deg, ${d.preview.from}, ${d.preview.to})`,
                      }}
                    >
                      {active ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hidden items-center justify-between gap-3 rounded-2xl bg-surface/60 px-3.5 py-3 text-[11px] font-semibold lg:flex">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              {t("walletPage.giftPanel.balanceOk", {
                defaultValue: "Balans: {{amount}}",
                amount: formatPrice(balance),
              })}
            </span>
            <span className="tabular-nums text-foreground">
              {t("walletPage.giftPanel.total", { defaultValue: "Jami" })} {formatPrice(total)}
            </span>
          </div>
        </div>

        {/* Form column */}
        <div className="space-y-7">
          {/* Recipient */}
          <section>
            <label
              htmlFor={recipientInputId}
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {t("walletPage.giftPanel.recipientField", { defaultValue: "Kimga" })}
            </label>

            {recipientUserId && recipientLabel ? (
              <div className="mt-2.5 flex items-center gap-3 rounded-[20px] bg-surface/70 px-3 py-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background">
                  <UserRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{recipientLabel}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("walletPage.giftPanel.recipientSelected", {
                      defaultValue: "Tanlandi",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearRecipient}
                  aria-label={t("common.change", { defaultValue: "Almashtirish" })}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-background text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative mt-2.5">
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
                  className="w-full rounded-[20px] bg-surface/70 py-3.5 pl-10 pr-4 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                  autoComplete="off"
                />
                {recipients.length > 0 && !recipientUserId ? (
                  <ul className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-48 overflow-y-auto rounded-[20px] bg-background shadow-lg ring-1 ring-border">
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

          {/* Amount */}
          <section>
            <div className="flex items-end justify-between gap-3">
              <label
                htmlFor={amountInputId}
                className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
              >
                {t("walletPage.giftPanel.chooseAmount", { defaultValue: "Summani tanlang" })}
              </label>
              <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {formatPrice(MIN_GIFT)} — {formatPrice(MAX_GIFT)}
              </p>
            </div>

            <p className="mt-2 text-[2rem] font-bold tracking-tight tabular-nums leading-none">
              {formatPrice(giftAmount > 0 ? giftAmount : 0)}
            </p>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {GIFT_PRESETS.map((g) => {
                const active = presetId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selectPreset(g.id)}
                    className={cn(
                      "cursor-pointer rounded-2xl py-3 text-sm font-bold transition-colors duration-200",
                      active
                        ? "bg-foreground text-background"
                        : "bg-surface/70 text-foreground hover:bg-surface",
                    )}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            <div className="relative mt-2.5">
              <input
                id={amountInputId}
                type="text"
                inputMode="numeric"
                value={amountFieldValue}
                onChange={(e) => {
                  setPresetId("custom");
                  setCustomAmount(formatAmountInput(e.target.value));
                }}
                onFocus={() => {
                  if (presetId !== "custom") {
                    setPresetId("custom");
                    setCustomAmount(giftAmount > 0 ? giftAmount.toLocaleString("uz-UZ") : "");
                  }
                }}
                placeholder={t("walletPage.giftPanel.customAmountHint", {
                  defaultValue: "Yoki o'zingiz yozing…",
                })}
                className="w-full rounded-[20px] bg-surface/70 px-4 py-3.5 text-sm font-bold tabular-nums placeholder:font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground">
                so&apos;m
              </span>
            </div>
          </section>

          {/* Message */}
          <section>
            <label
              htmlFor={noteInputId}
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {t("walletPage.giftPanel.noteField", { defaultValue: "Tabriknoma" })}
            </label>

            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {OCCASIONS.map((occ) => {
                const Icon = occ.icon;
                const active = occasionId === occ.id;
                return (
                  <button
                    key={occ.id}
                    type="button"
                    onClick={() => applyOccasion(occ.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition-colors duration-200",
                      active
                        ? "bg-foreground text-background"
                        : "bg-surface/70 text-foreground hover:bg-surface",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-bold leading-tight">
                      {t(occ.labelKey, { defaultValue: occ.defaultLabel })}
                    </span>
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
              className="mt-2.5 w-full resize-none rounded-[20px] bg-surface/70 px-4 py-3.5 text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
            />
            <p className="mt-1.5 text-right text-[10px] font-semibold tabular-nums text-muted-foreground">
              {note.length}/500
            </p>
          </section>

          <div className="hidden space-y-2 lg:block">
            <p
              className={cn(
                "text-[11px] font-semibold",
                canSend ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {missingHint}
            </p>
            <button
              type="button"
              disabled={!canSend}
              onClick={onContinueToConfirm}
              className="w-full cursor-pointer rounded-[20px] bg-foreground py-4 text-sm font-bold text-background transition-transform duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("walletPage.giftPanel.review", { defaultValue: "Tekshirib yuborish" })}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile sticky checkout */}
      <motion.div
        initial={reduced ? false : { y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 px-4 lg:hidden"
      >
        <div className="mx-auto max-w-lg overflow-hidden rounded-[24px] bg-foreground text-background shadow-[0_18px_48px_-18px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-1 border-b border-white/10 px-4 py-2 text-[10px] font-semibold tabular-nums opacity-70">
            <span>{formatPrice(giftAmount)}</span>
            <span>+</span>
            <span>{formatPrice(designFee)}</span>
            <span className="ml-auto inline-flex items-center gap-1 opacity-90">
              <Wallet className="h-3 w-3" />
              {formatPrice(balance)}
            </span>
          </div>
          <div className="flex items-center gap-3 p-2 pl-4">
            <div className="min-w-0 flex-1">
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
        </div>
        {!canSend ? (
          <p className="mx-auto mt-2 max-w-lg px-1 text-center text-[10px] font-semibold text-destructive">
            {missingHint}
          </p>
        ) : null}
      </motion.div>

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
              {t("walletPage.giftPanel.confirmTitle", { defaultValue: "Tasdiqlash" })}
            </p>
            <h3 id="gift-confirm-heading" className="mt-2 text-lg font-bold">
              {t("walletPage.giftPanel.confirmHeading", { defaultValue: "Sovg'ani yuborasizmi?" })}
            </h3>

            <div className="mt-4">
              <GiftCardPreview
                design={selectedDesign}
                amount={giftAmount}
                recipientLabel={recipientLabel || query}
                note={note}
                occasionLabel={occasionLabel}
                compact
              />
            </div>

            <ul className="mt-3 space-y-2.5 text-sm">
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
              <li className="flex justify-between gap-3 border-t border-border/60 pt-2.5 font-bold">
                <span>{t("walletPage.giftPanel.total", { defaultValue: "Jami" })}</span>
                <span className="tabular-nums">{formatPrice(total)}</span>
              </li>
            </ul>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={sendGift.isPending}
                className="cursor-pointer rounded-[18px] bg-surface py-3.5 text-sm font-bold transition-colors hover:bg-surface/80"
              >
                {t("common.back", { defaultValue: "Orqaga" })}
              </button>
              <button
                type="button"
                disabled={sendGift.isPending}
                onClick={onSend}
                className="cursor-pointer rounded-[18px] bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-40"
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
