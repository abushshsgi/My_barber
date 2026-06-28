import { Activity, Loader2, Radio, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeStatus, type RealtimeUiStatus } from "@/hooks/use-realtime-status";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_META: Record<
  RealtimeUiStatus,
  { label: string; hint: string; dot: string; Icon: typeof Radio }
> = {
  live: {
    label: "Live",
    hint: "Redis ulangan va WebSocket ochiq — bronlar darhol yangilanadi.",
    dot: "bg-emerald-500",
    Icon: Radio,
  },
  redis_only: {
    label: "Redis OK",
    hint: "Redis ishlayapti, lekin WebSocket hali ulanmagan. Qisqa vaqt kuting yoki sahifani yangilang.",
    dot: "bg-amber-400",
    Icon: Wifi,
  },
  polling: {
    label: "Polling",
    hint: "REDIS_URL yo'q yoki o'chiq — yangilanish 2–8 soniyada bir marta.",
    dot: "bg-muted-foreground/50",
    Icon: Activity,
  },
  redis_error: {
    label: "Redis xato",
    hint: "REDIS_URL bor, lekin Redis javob bermayapti. Railway Variables va Redis servisini tekshiring.",
    dot: "bg-destructive",
    Icon: WifiOff,
  },
  checking: {
    label: "Tekshirilmoqda",
    hint: "Server holati so'ralmoqda…",
    dot: "bg-muted-foreground/40 animate-pulse",
    Icon: Loader2,
  },
};

export function RealtimeStatusBadge({ className }: { className?: string }) {
  const { status, health, wsOpen } = useRealtimeStatus(true);
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  const redis = health?.redis;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm",
              status === "live" && "border-emerald-500/30 bg-emerald-500/5",
              status === "redis_error" && "border-destructive/30 bg-destructive/5",
              className,
            )}
          >
            <span className="relative flex size-2">
              {status === "live" ? (
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              ) : null}
              <span className={cn("relative inline-flex size-2 rounded-full", meta.dot)} />
            </span>
            <Icon className={cn("size-3.5", status === "checking" && "animate-spin")} />
            <span className="hidden sm:inline">{meta.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <p className="font-semibold">{meta.label}</p>
          <p className="mt-1 text-muted-foreground">{meta.hint}</p>
          {redis ? (
            <ul className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
              <li>Redis: {redis.configured ? (redis.ping ? "ping OK" : "ping FAIL") : "yo'q"}</li>
              <li>Channel: {redis.channel_layer}</li>
              <li>WebSocket: {wsOpen ? "ulangan" : "ulanmagan"}</li>
            </ul>
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
