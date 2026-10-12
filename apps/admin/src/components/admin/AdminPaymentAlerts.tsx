import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api";
import { formatAdminUzsFull } from "@/lib/admin-analytics";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PayHref =
  | "/admin/subscriptions"
  | "/admin/finance/qr-payments"
  | "/admin/finance/deposits";

type PaymentPing = {
  id: string;
  amount: number;
  title: string;
  href: PayHref;
  at: string;
};

const SEEN_KEY = "admin-payment-seen-v1";
const POLL_MS = 12_000;

function readSeen(): { ready: boolean; ids: string[] } {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return { ready: false, ids: [] };
    const parsed = JSON.parse(raw) as { ready?: boolean; ids?: string[] };
    return { ready: Boolean(parsed.ready), ids: Array.isArray(parsed.ids) ? parsed.ids : [] };
  } catch {
    return { ready: false, ids: [] };
  }
}

function writeSeen(ids: string[]) {
  localStorage.setItem(SEEN_KEY, JSON.stringify({ ready: true, ids: ids.slice(-240) }));
}

async function loadPaymentPings(): Promise<PaymentPing[]> {
  const [subs, qr, deposits] = await Promise.all([
    apiJson<{ results?: Array<Record<string, unknown>> }>(
      "/api/v1/admin/subscriptions/payments/?status=paid",
    ).catch(() => ({ results: [] })),
    apiJson<{ results?: Array<Record<string, unknown>> }>(
      "/api/v1/admin/finance/qr-payments/?page_size=8",
    ).catch(() => ({ results: [] })),
    apiJson<{ results?: Array<Record<string, unknown>> }>(
      "/api/v1/admin/wallet/deposits/?status=claimed&page_size=8",
    ).catch(() => ({ results: [] })),
  ]);

  const rows: PaymentPing[] = [];
  for (const row of subs.results ?? []) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const user = row.user as { full_name?: string; phone?: string } | undefined;
    const who = String(row.user_name || user?.full_name || user?.phone || "Foydalanuvchi");
    rows.push({
      id: `sub:${id}`,
      amount: Number(row.amount_uzs ?? 0),
      title: `Obuna · ${who}`,
      href: "/admin/subscriptions",
      at: String(row.paid_at || row.created_at || ""),
    });
  }
  for (const row of qr.results ?? []) {
    if (String(row.status || "") !== "completed") continue;
    const id = String(row.id ?? "");
    if (!id) continue;
    rows.push({
      id: `qr:${id}`,
      amount: Number(row.amount ?? 0),
      title: `QR · ${String(row.payer_name || "Mijoz")}`,
      href: "/admin/finance/qr-payments",
      at: String(row.created_at || ""),
    });
  }
  for (const row of deposits.results ?? []) {
    const id = String(row.id ?? "");
    if (!id) continue;
    const user = row.user as { full_name?: string; phone?: string } | undefined;
    const who = String(user?.full_name || user?.phone || "Mijoz");
    rows.push({
      id: `dep:${id}`,
      amount: Number(row.amount ?? 0),
      title: `Karta to'lovi · ${who}`,
      href: "/admin/finance/deposits",
      at: String(row.claimed_at || row.created_at || ""),
    });
  }
  return rows;
}

export function AdminPaymentAlerts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);
  const busyRef = useRef(false);
  const [items, setItems] = useState<PaymentPing[]>([]);
  const [unseen, setUnseen] = useState(0);

  const getAudio = () => {
    if (!audioRef.current) {
      const audio = new Audio("/sounds/universfield-attention-chime-123107.mp3");
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  };

  const playSound = () => {
    const audio = getAudio();
    audio.currentTime = 0;
    void audio.play().catch(() => {
      /* brauzer ovozni birinchi bosishdan keyin ochadi */
    });
  };

  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      const audio = getAudio();
      const prev = audio.volume;
      audio.volume = 0;
      void audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = prev || 1;
        })
        .catch(() => {
          audio.volume = prev || 1;
        });
    };
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    let stopped = false;

    const tick = async () => {
      if (stopped || busyRef.current || document.visibilityState === "hidden") return;
      busyRef.current = true;
      try {
        const rows = await loadPaymentPings();
        if (stopped) return;
        const store = readSeen();
        const known = new Set(store.ids);
        if (!store.ready) {
          writeSeen(rows.map((row) => row.id));
          return;
        }
        const fresh = rows.filter((row) => !known.has(row.id));
        if (!fresh.length) return;
        writeSeen([...store.ids, ...fresh.map((row) => row.id)]);
        playSound();
        setItems((prev) => [...fresh, ...prev].slice(0, 12));
        setUnseen((count) => count + fresh.length);
        const head = fresh[0];
        const extra = fresh.length > 1 ? ` · yana ${fresh.length - 1} ta` : "";
        toast.success(`Yangi to'lov keldi: ${formatAdminUzsFull(head.amount)}`, {
          description: `${head.title}${extra}`,
          action: {
            label: "Ochish",
            onClick: () => {
              void navigate({ to: head.href });
            },
          },
        });
        void queryClient.invalidateQueries({ queryKey: ["admin", "subscriptions", "payments"] });
        void queryClient.invalidateQueries({ queryKey: ["admin", "qr-payments"] });
        void queryClient.invalidateQueries({ queryKey: ["admin", "wallet-deposits"] });
      } catch {
        /* tarmoq xatosi keyingi aylanishda qayta uriniladi */
      } finally {
        busyRef.current = false;
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [navigate, queryClient]);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) setUnseen(0);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="To'lov bildirishnomalari">
          <Bell className="size-4" />
          {unseen > 0 ? (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-semibold text-white leading-4">
              {unseen > 9 ? "9+" : unseen}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>To'lovlar</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-sm text-muted-foreground">Hali yangi to'lov yo'q</div>
        ) : (
          items.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex flex-col items-start gap-0.5 py-2"
              onClick={() => void navigate({ to: item.href })}
            >
              <span className="text-sm font-medium">{formatAdminUzsFull(item.amount)}</span>
              <span className="text-xs text-muted-foreground">{item.title}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
