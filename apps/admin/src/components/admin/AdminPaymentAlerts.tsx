import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { apiJson } from "@/lib/api";
import { formatAdminUzsExact } from "@/lib/admin-analytics";
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
const POLL_MS = 2_500;

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

const HREFS = new Set<PayHref>([
  "/admin/subscriptions",
  "/admin/finance/qr-payments",
  "/admin/finance/deposits",
]);

function asHref(value: unknown): PayHref {
  const href = String(value || "");
  return HREFS.has(href as PayHref) ? (href as PayHref) : "/admin/finance/deposits";
}

async function loadPaymentPings(): Promise<PaymentPing[]> {
  const data = await apiJson<{ results?: Array<Record<string, unknown>> }>(
    "/api/v1/admin/finance/payment-pings/",
  );
  const rows: PaymentPing[] = [];
  for (const row of data.results ?? []) {
    const id = String(row.id ?? "");
    if (!id) continue;
    rows.push({
      id,
      amount: Number(row.amount ?? 0),
      title: String(row.title || "To'lov"),
      href: asHref(row.href),
      at: String(row.at || ""),
    });
  }
  return rows;
}

function showOsNotice(title: string, body: string, onOpen: () => void, silent: boolean) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const note = new Notification(title, { body, tag: "admin-payment-ping", silent });
    note.onclick = () => {
      window.focus();
      onOpen();
      note.close();
    };
  } catch {
    /* brauzer tizim bildirishnomasini rad etsa, ovoz baribir chaladi */
  }
}

function armBackgroundKeepAlive() {
  const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.001;
  osc.frequency.value = 20;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  void ctx.resume();
  return ctx;
}

export function AdminPaymentAlerts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const keepAliveRef = useRef<AudioContext | null>(null);
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

  const playSound = async () => {
    const audio = getAudio();
    audio.volume = 1;
    audio.currentTime = 0;
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      if (!keepAliveRef.current) keepAliveRef.current = armBackgroundKeepAlive();
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
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
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      void keepAliveRef.current?.close();
      keepAliveRef.current = null;
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer = 0;

    const tick = async () => {
      if (stopped || busyRef.current) return;
      busyRef.current = true;
      try {
        if (keepAliveRef.current?.state === "suspended") void keepAliveRef.current.resume();
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
        const played = await playSound();
        setItems((prev) => [...fresh, ...prev].slice(0, 12));
        setUnseen((count) => count + fresh.length);
        const head = fresh[0];
        const extra = fresh.length > 1 ? ` · yana ${fresh.length - 1} ta` : "";
        const title = `Yangi to'lov keldi: ${formatAdminUzsExact(head.amount)}`;
        const description = `${head.title}${extra}`;
        const away = document.visibilityState === "hidden" || !document.hasFocus();
        if (away) {
          showOsNotice(title, description, () => {
            void navigate({ to: head.href });
          }, played);
        }
        toast.success(title, {
          description,
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

    const arm = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void tick().finally(() => {
          if (!stopped) arm(POLL_MS);
        });
      }, delay);
    };

    void tick().finally(() => {
      if (!stopped) arm(POLL_MS);
    });

    const wake = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      void tick().finally(() => {
        if (!stopped) arm(POLL_MS);
      });
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
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
              <span className="text-sm font-medium">{formatAdminUzsExact(item.amount)}</span>
              <span className="text-xs text-muted-foreground">{item.title}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
