import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchSubscriptionPaymentStatus,
  type SubscriptionPaymentStatus,
} from "@/lib/api/subscriptions";

const PENDING_KEY = "mysaloon.payme.sub_order";

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
    sessionStorage.setItem(PENDING_KEY, orderId);
  } catch {
    /* ignore */
  }
}

function StatusIcon({ status }: { status: string }) {
  if (status === "paid") return <CheckCircle2 className="h-10 w-10 text-emerald-600" />;
  if (status === "pending") return <Clock3 className="h-10 w-10 text-muted-foreground" />;
  return <XCircle className="h-10 w-10 text-destructive" />;
}

function statusCopy(status: string): { title: string; body: string } {
  if (status === "paid") {
    return {
      title: "To'lov tasdiqlandi",
      body: "Obuna Payme cheki tasdiqlangandan keyin yoqildi.",
    };
  }
  if (status === "pending") {
    return {
      title: "To'lov kutilmoqda",
      body: "Payme Checkout oynasini yopgan bo'lsangiz ham, holat serverda tekshiriladi. Iltimos, kuting.",
    };
  }
  if (status === "cancelled") {
    return { title: "To'lov bekor qilindi", body: "Payme cheki bekor qilindi. Obuna yoqilmadi." };
  }
  if (status === "expired") {
    return { title: "To'lov muddati o'tdi", body: "Chek eskirgan. Yangi to'lovni qayta boshlang." };
  }
  if (status === "refunded") {
    return { title: "To'lov qaytarildi", body: "Mablag' qaytarilgan. Obuna yoqilmaydi." };
  }
  return {
    title: "To'lov amalga oshmadi",
    body: "Payme to'lovi tasdiqlanmadi. Obuna yoqilmadi.",
  };
}

export function PaymeCheckoutStatus({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [row, setRow] = useState<SubscriptionPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let ticks = 0;
    const poll = async () => {
      try {
        const data = await fetchSubscriptionPaymentStatus(orderId);
        if (cancelled) return;
        setRow(data);
        setError(null);
        if (data.status === "paid") {
          void qc.invalidateQueries({ queryKey: ["subscriptions"] });
          void qc.invalidateQueries({ queryKey: ["subscriptions", "me"] });
          try {
            sessionStorage.removeItem(PENDING_KEY);
          } catch {
            /* ignore */
          }
        }
        return data.status;
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Holat o'qilmadi");
        return "error";
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      ticks += 1;
      void (async () => {
        const status = await poll();
        if (status && status !== "pending") window.clearInterval(timer);
        if (ticks >= 45) window.clearInterval(timer);
      })();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId, qc]);

  const status = row?.status || (error ? "failed" : "pending");
  const copy = statusCopy(status);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-4">
        {row || error ? <StatusIcon status={status} /> : <Loader2 className="h-10 w-10 animate-spin" />}
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Payme
          </p>
          <h1 className="mt-1 text-xl font-bold">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || copy.body}</p>
          {row?.amount_uzs ? (
            <p className="mt-2 text-sm font-semibold">{row.amount_uzs.toLocaleString("uz-UZ")} so'm</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          to="/wallet"
          search={{ section: "subscriptions" } as never}
          className="inline-flex h-10 items-center rounded-xl bg-foreground px-4 text-sm font-bold text-background"
        >
          Obunalarga qaytish
        </Link>
        {row?.checkout_url && status === "pending" ? (
          <a
            href={row.checkout_url}
            className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-bold"
          >
            Payme sahifasini ochish
          </a>
        ) : null}
      </div>
    </div>
  );
}
