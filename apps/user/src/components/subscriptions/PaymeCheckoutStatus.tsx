import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchSubscriptionPaymentStatus,
  type SubscriptionPaymentStatus,
} from "@/lib/api/subscriptions";

const PENDING_KEY = "mysaloon.payme.sub_order";
const AWAIT_KEY = "mysaloon.payme.await_return";

export function readStoredPaymeOrder(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("order_id") || params.get("sub_order");
  if (fromQuery && fromQuery.startsWith("sub-")) return fromQuery;
  try {
    const stored = sessionStorage.getItem(PENDING_KEY);
    return stored && stored.startsWith("sub-") ? stored : null;
  } catch {
    return null;
  }
}

export function storePaymeOrder(orderId: string) {
  try {
    if (orderId.startsWith("sub-")) sessionStorage.setItem(PENDING_KEY, orderId);
  } catch {
    /* ignore */
  }
}

export function clearPaymeOrder() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(AWAIT_KEY);
  } catch {
    /* ignore */
  }
}

/** Payme oynasiga ketishdan oldin: qaytganda holat sahifasiga tushirish. */
export function markPaymeAwaitReturn() {
  try {
    sessionStorage.setItem(AWAIT_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPaymeAwaitReturn() {
  try {
    sessionStorage.removeItem(AWAIT_KEY);
  } catch {
    /* ignore */
  }
}

/** Payme Referer orqali bosh sahifaga qaytarsa ham to'lov holatiga olib kiradi. */
export function PaymeReturnCatcher() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname === "/subscriptions/payme" || pathname.startsWith("/subscriptions/payme/")) return;
    let awaiting = false;
    let order: string | null = null;
    try {
      awaiting = sessionStorage.getItem(AWAIT_KEY) === "1";
      order = sessionStorage.getItem(PENDING_KEY);
    } catch {
      return;
    }
    if (!awaiting || !order || !order.startsWith("sub-")) return;
    clearPaymeAwaitReturn();
    void navigate({ to: "/subscriptions/payme", replace: true });
  }, [pathname, navigate]);

  return null;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "paid") return <CheckCircle2 className="size-10" strokeWidth={1.5} />;
  if (status === "pending") return <Clock3 className="size-10 text-[var(--morph-muted,#737373)]" strokeWidth={1.5} />;
  return <XCircle className="size-10" strokeWidth={1.5} />;
}

function statusCopy(status: string): { title: string; body: string } {
  if (status === "paid") {
    return {
      title: "To‘lov tasdiqlandi",
      body: "Obuna yoqildi. Obunalar sahifasiga qaytilmoqda.",
    };
  }
  if (status === "pending") {
    return {
      title: "To‘lov tekshirilmoqda",
      body: "Payme sahifasida to‘lang. Holatni server o‘zi tasdiqlaydi — bu yerda «to‘landi» deb yozib bo‘lmaydi.",
    };
  }
  if (status === "cancelled") {
    return { title: "To‘lov bekor qilindi", body: "Payme cheki bekor qilindi. Obuna yoqilmadi." };
  }
  if (status === "expired") {
    return { title: "To‘lov muddati o‘tdi", body: "Chek eskirgan. Obunalar sahifasidan qayta boshlang." };
  }
  if (status === "refunded") {
    return { title: "To‘lov qaytarildi", body: "Mablag‘ qaytarilgan. Obuna yoqilmaydi." };
  }
  return {
    title: "To‘lov amalga oshmadi",
    body: "Payme to‘lovi tasdiqlanmadi. Obuna yoqilmadi.",
  };
}

export function PaymeCheckoutStatus({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [row, setRow] = useState<SubscriptionPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearPaymeAwaitReturn();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let attempt = 0;

    const poll = async () => {
      attempt += 1;
      try {
        const data = await fetchSubscriptionPaymentStatus(orderId);
        if (cancelled) return;
        setRow(data);
        setError(null);
        if (data.status !== "pending") {
          clearPaymeOrder();
          if (data.status === "paid") {
            void qc.invalidateQueries({ queryKey: ["subscriptions"] });
            void qc.invalidateQueries({ queryKey: ["subscriptions", "me"] });
          }
          return;
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Holat o‘qilmadi");
      }
      if (cancelled || attempt >= 40) return;
      const delay = attempt < 8 ? 2000 : 5000;
      timer = window.setTimeout(() => void poll(), delay);
    };

    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderId, qc]);

  useEffect(() => {
    if (row?.status !== "paid") return;
    const timer = window.setTimeout(() => {
      void navigate({ to: "/wallet", search: { section: "subscriptions" } as never, replace: true });
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [row?.status, navigate]);

  const status = row?.status || "pending";
  const copy = statusCopy(status);
  const needsLogin = Boolean(error && /401|credentials|Authentication/i.test(error));

  return (
    <div className="rounded-2xl border border-black/10 bg-[var(--morph-card,#fff)] px-4 py-5">
      <div className="flex items-start gap-3">
        {row ? <StatusIcon status={status} /> : <Loader2 className="size-10 animate-spin" strokeWidth={1.5} />}
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--morph-muted,#737373)]">
            Payme
          </p>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--morph-muted,#737373)]">
            {needsLogin ? "To‘lov holatini ko‘rish uchun hisobingizga kiring." : copy.body}
          </p>
          {error && status === "pending" && !needsLogin ? (
            <p className="mt-2 text-sm font-semibold">
              {/failed to fetch|network|502|proxy/i.test(error)
                ? "Serverga ulanib bo‘lmadi. Holat qayta tekshiriladi."
                : error}
            </p>
          ) : null}
          {row?.amount_uzs ? (
            <p className="mt-3 text-lg font-extrabold tabular-nums">
              {row.amount_uzs.toLocaleString("uz-UZ")} so‘m
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2">
        {needsLogin ? (
          <Link
            to="/auth"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--morph-fg,#111)] px-4 text-sm font-extrabold text-[var(--morph-bg,#fff)]"
          >
            Kirish
          </Link>
        ) : (
          <Link
            to="/wallet"
            search={{ section: "subscriptions" } as never}
            onClick={() => clearPaymeAwaitReturn()}
            className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--morph-fg,#111)] px-4 text-sm font-extrabold text-[var(--morph-bg,#fff)]"
          >
            Obunalarga qaytish
          </Link>
        )}
        {row?.checkout_url && status === "pending" ? (
          <a
            href={row.checkout_url}
            className="inline-flex h-12 items-center justify-center rounded-full border border-black/15 px-4 text-sm font-bold"
          >
            Payme sahifasini ochish
          </a>
        ) : null}
      </div>
    </div>
  );
}
