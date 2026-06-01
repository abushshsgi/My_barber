import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import {
  Gift,
  Plus,
  ChevronLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Nfc,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  WalletCardCreamCap,
  WalletEmvChip,
  walletCardStyle,
} from "@/components/wallet/WalletCardBrand";
import { formatPrice, loyaltyMock, userProfile, walletSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Hamyon — mysaloon.uz" },
      { name: "description", content: "Cashback balansi, sovg'a kartalar va to'lov tarixi." },
    ],
  }),
  component: WalletPage,
});

type Tab = "all" | "in" | "out";

interface Tx {
  id: string;
  kind: "in" | "out";
  title: string;
  date: string;
  amount: number;
}

const TXS: Tx[] = [
  { id: "t1", kind: "in", title: "Cashback · Modern Cuts", date: "Bugun", amount: 12000 },
  { id: "t2", kind: "out", title: "Bron · Lazzat Spa", date: "Kecha", amount: -180000 },
  { id: "t3", kind: "in", title: "Do'stni taklif qildingiz", date: "2 kun oldin", amount: 25000 },
  { id: "t4", kind: "out", title: "Sovg'a karta · Madina", date: "5 kun oldin", amount: -100000 },
  { id: "t5", kind: "in", title: "Promo · Yangi yil", date: "1 hafta", amount: 50000 },
];

function formatTxAmount(n: number) {
  return new Intl.NumberFormat("uz-UZ").format(Math.abs(n)) + " so'm";
}

function plasticPan(balance: number) {
  const n = String(balance).padStart(12, "0").slice(-12);
  return `8600 ${n.slice(0, 4)} ${n.slice(4, 8)} ${n.slice(8, 12)}`;
}

const TILT_SPRING = { type: "spring" as const, stiffness: 320, damping: 24 };
const MAX_TILT_Y = 24;
const MAX_TILT_X = 18;

/** Plastik karta — o'z joyida 3D egilish (tilt), surilmaydi. */
function PlasticCard() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const pressing = useRef(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);

  const resetTilt = useCallback(() => {
    animate(rotateX, 0, TILT_SPRING);
    animate(rotateY, 0, TILT_SPRING);
  }, [rotateX, rotateY]);

  const applyTilt = useCallback(
    (clientX: number, clientY: number) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const dx = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const dy = ((clientY - rect.top) / rect.height - 0.5) * 2;
      rotateY.set(dx * MAX_TILT_Y);
      rotateX.set(-dy * MAX_TILT_X);
    },
    [rotateX, rotateY],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (reduced) return;
      pressing.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      applyTilt(e.clientX, e.clientY);
    },
    [reduced, applyTilt],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current || reduced) return;
      applyTilt(e.clientX, e.clientY);
    },
    [reduced, applyTilt],
  );

  const endTilt = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!pressing.current) return;
      pressing.current = false;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      resetTilt();
    },
    [resetTilt],
  );

  return (
    <div
      className="w-full max-w-[340px]"
      style={{ perspective: 1100 }}
    >
      <motion.article
        ref={cardRef}
        className={cn(
          "relative aspect-[1.586/1] w-full touch-none select-none overflow-hidden rounded-[26px] text-background",
          !reduced && "cursor-grab active:cursor-grabbing",
        )}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          touchAction: "none",
          transformOrigin: "50% 55%",
          background: walletCardStyle.background,
          boxShadow: walletCardStyle.boxShadow,
        }}
        initial={reduced ? false : { opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileTap={reduced ? undefined : { scale: 0.98 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endTilt}
        onPointerCancel={endTilt}
      >
      <WalletCardCreamCap />

      <div className="relative z-20 flex h-[54%] flex-col justify-between px-5 pb-4 pt-5 text-foreground">
        <div className="flex items-start justify-between">
          <WalletEmvChip />
          <motion.div
            className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background"
            animate={reduced ? undefined : { scale: [1, 1.04, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            aria-label={t("walletPage.nfc")}
          >
            <Nfc className="h-5 w-5" strokeWidth={2.2} />
          </motion.div>
        </div>
        <p className="text-[42px] font-bold leading-none tracking-tight tabular-nums">
          {walletSummary.balance.toLocaleString("uz-UZ")}
          <span className="ml-1.5 text-lg font-bold text-muted-foreground">so'm</span>
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-[48%] flex-col justify-end px-5 pb-5 pt-2">
        <p className="font-mono text-[14px] font-semibold tracking-[0.24em] tabular-nums text-background/80">
          {plasticPan(walletSummary.balance)}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-background/15 pt-3">
          <p className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wide text-background/90">
            {userProfile.name}
          </p>
          <span className="shrink-0 rounded-sm bg-background px-2 py-0.5 text-[8px] font-bold uppercase text-foreground">
            {loyaltyMock.tier}
          </span>
          <p className="shrink-0 font-mono text-[11px] font-bold text-background/55">12/28</p>
        </div>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.3em] text-background/40">
          mysaloon
        </p>
      </div>
    </motion.article>
    </div>
  );
}

function WalletPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("all");

  const visible = TXS.filter((tx) => tab === "all" || tx.kind === tab);

  const cashbackTotal = useMemo(
    () => TXS.filter((tx) => tx.kind === "in").reduce((sum, tx) => sum + tx.amount, 0),
    [],
  );

  const tabLabels: Record<Tab, string> = {
    all: t("walletPage.tabs.all"),
    in: t("walletPage.tabs.in"),
    out: t("walletPage.tabs.out"),
  };

  return (
    <div className="min-h-full bg-background pb-[calc(68px+env(safe-area-inset-bottom)+16px)]">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
        <Link
          to="/profile"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface active:opacity-80"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
        </Link>
        <h1 className="text-lg font-bold">{t("walletPage.title")}</h1>
      </header>

      <div className="px-5 pt-4">
        <div className="relative mx-auto flex min-h-[210px] w-full max-w-[360px] items-center justify-center overflow-visible py-6">
          <PlasticCard />
        </div>
        <p className="text-center text-[11px] font-medium text-muted-foreground">
          {t("walletPage.dragHint")}
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-10 px-5">
        <button type="button" className="flex flex-col items-center gap-2 active:scale-95">
          <span className="grid h-[60px] w-[60px] place-items-center rounded-full bg-foreground text-background shadow-lg">
            <Plus className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <span className="text-[11px] font-bold">{t("walletPage.topUp")}</span>
        </button>
        <Link to="/giftcard" className="flex flex-col items-center gap-2 active:scale-95">
          <span className="grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-foreground bg-card">
            <Gift className="h-7 w-7" strokeWidth={2} />
          </span>
          <span className="text-[11px] font-bold">{t("walletPage.gift")}</span>
        </Link>
      </div>

      <div className="mx-5 mt-6 flex gap-3">
        <div className="flex-1 rounded-[24px] bg-surface px-4 py-3 text-center">
          <p className="text-lg font-bold tabular-nums">{Math.round(cashbackTotal / 1000)}k</p>
          <p className="text-[9px] font-bold uppercase text-muted-foreground">
            {t("walletPage.stats.cashback")}
          </p>
        </div>
        <Link
          to="/loyalty"
          className="flex-1 rounded-[24px] bg-surface px-4 py-3 text-center active:opacity-90"
        >
          <p className="text-lg font-bold tabular-nums">{loyaltyMock.points.toLocaleString()}</p>
          <p className="text-[9px] font-bold uppercase text-muted-foreground">
            {t("walletPage.stats.bonus")}
          </p>
        </Link>
      </div>

      <section className="mx-5 mt-8">
        <h2 className="text-sm font-bold">{t("walletPage.recent")}</h2>

        <div className="mt-3 flex gap-2">
          {(["all", "in", "out"] as Tab[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "rounded-full px-4 py-2 text-[12px] font-bold",
                tab === k ? "bg-foreground text-background" : "bg-surface text-muted-foreground",
              )}
            >
              {tabLabels[k]}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">{t("walletPage.empty")}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {visible.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center gap-3 rounded-[24px] bg-surface px-4 py-4"
              >
                <span
                  className={cn(
                    "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                    tx.kind === "in" ? "bg-foreground text-background" : "bg-background",
                  )}
                >
                  {tx.kind === "in" ? (
                    <ArrowDownLeft className="h-5 w-5" strokeWidth={2.2} />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" strokeWidth={2.2} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{tx.title}</p>
                  <p className="text-[11px] text-muted-foreground">{tx.date}</p>
                </div>
                <p
                  className={cn(
                    "shrink-0 text-[15px] font-bold tabular-nums",
                    tx.kind === "in" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {tx.kind === "in" ? "+" : "−"}
                  {formatTxAmount(tx.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="mt-4 w-full rounded-full bg-surface py-3.5 text-[12px] font-bold active:opacity-80"
        >
          {t("walletPage.fullHistory")}
        </button>
      </section>
    </div>
  );
}
