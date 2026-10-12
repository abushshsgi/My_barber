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

function showOsNotice(title: string, body: string, onOpen: () => void) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const note = new Notification(title, { body, tag: "admin-payment-ping", silent: false });
    note.onclick = () => {
      window.focus();
      onOpen();
      note.close();
    };
  } catch {
    /* brauzer tizim bildirishnomasini rad etsa, chime baribir uriniladi */
  }
}

async function pingOs(title: string, body: string, href: PayHref, onOpen: () => void) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, {
        body,
        tag: "admin-payment-ping",
        renotify: true,
        silent: false,
        data: { href },
      });
      return;
    }
  } catch {
    /* sahifa bildirishnomasi */
  }
  showOsNotice(title, body, onOpen);
}

let bedUrl = "";

function quietBedUrl() {
  if (bedUrl) return bedUrl;
  const sampleRate = 8000;
  const samples = sampleRate;
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < samples; i += 1) {
    const sample = Math.sin((2 * Math.PI * 180 * i) / sampleRate) * 0.02 * 32767;
    view.setInt16(44 + i * 2, sample, true);
  }
  bedUrl = URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
  return bedUrl;
}

export function AdminPaymentAlerts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bedRef = useRef<HTMLAudioElement | null>(null);
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
    audio.volume = 1;
    try {
      audio.currentTime = 0;
    } catch {
      /* hali tayyor emas */
    }
    void audio.play().catch(() => undefined);
  };

  const startBed = () => {
    if (!bedRef.current) {
      const bed = new Audio(quietBedUrl());
      bed.loop = true;
      bed.volume = 0.05;
      bedRef.current = bed;
    }
    void bedRef.current.play().catch(() => undefined);
  };

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/admin-alerts-sw.js").catch(() => undefined);
    }
    const onMessage = (event: MessageEvent<{ type?: string; href?: PayHref }>) => {
      if (event.data?.type !== "admin-payment-open" || !event.data.href) return;
      void navigate({ to: event.data.href });
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [navigate]);

  useEffect(() => {
    const unlock = () => {
      if (!unlockedRef.current) {
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
      }
      startBed();
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      bedRef.current?.pause();
      bedRef.current = null;
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer = 0;

    const tick = async () => {
      if (stopped || busyRef.current) return;
      busyRef.current = true;
      try {
        if (bedRef.current?.paused) void bedRef.current.play().catch(() => undefined);
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
        setItems((prev) => [...fresh, ...prev].slice(0, 12));
        setUnseen((count) => count + fresh.length);
        const head = fresh[0];
        const extra = fresh.length > 1 ? ` · yana ${fresh.length - 1} ta` : "";
        const title = `Yangi to'lov keldi: ${formatAdminUzsExact(head.amount)}`;
        const description = `${head.title}${extra}`;
        const away = document.visibilityState === "hidden" || !document.hasFocus();
        if (away) {
          void pingOs(title, description, head.href, () => {
            void navigate({ to: head.href });
          });
        }
        playSound();
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

    const workerUrl = URL.createObjectURL(
      new Blob(["setInterval(() => postMessage(0), 2000)"], { type: "text/javascript" }),
    );
    const worker = new Worker(workerUrl);
    worker.onmessage = () => {
      if (document.visibilityState !== "hidden" || busyRef.current) return;
      window.clearTimeout(timer);
      void tick().finally(() => {
        if (!stopped) arm(POLL_MS);
      });
    };

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
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
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
