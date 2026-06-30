import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, ScanLine, UserCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { resolveCheckInPayload } from "@mybarber/shared/booking-lifecycle";
import { CheckInScanner } from "@/components/bookings/CheckInScanner";
import { CheckInOnboarding } from "@/components/bookings/CheckInOnboarding";
import { useCheckInByTokenMutation } from "@/hooks/use-barber-queries";
import { cn } from "@/lib/utils";

type Phase = "idle" | "scanning" | "submitting" | "success";

export function BarberManualCheckInCard({ onCheckedIn }: { onCheckedIn?: () => void }) {
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wedgeTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const checkInMut = useCheckInByTokenMutation();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const runCheckIn = useCallback(
    (payload: { token?: string; short_code?: string }) => {
      setPhase("submitting");
      checkInMut.mutate(payload, {
        onSuccess: () => {
          setPhase("success");
          setCode("");
          setScannerOpen(false);
          toast.success("Mijoz qabul qilindi");
          onCheckedIn?.();
          window.setTimeout(() => setPhase("idle"), 1200);
        },
        onError: (e) => {
          setPhase("idle");
          toast.error(e.message);
        },
      });
    },
    [checkInMut, onCheckedIn],
  );

  const submitRaw = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        toast.error("Mijoz kodini kiriting");
        return;
      }
      const payload = resolveCheckInPayload(trimmed);
      if (!payload) {
        toast.error("Kod formati noto'g'ri. QR, 6 xonali kod yoki skaner natijasini kiriting.");
        return;
      }
      runCheckIn(payload);
    },
    [runCheckIn],
  );

  const submit = () => submitRaw(code);

  const handleInputChange = (value: string) => {
    const payload = resolveCheckInPayload(value);
    if (payload?.token) {
      setCode("");
      runCheckIn(payload);
      return;
    }
    setCode(value.toUpperCase());

    if (wedgeTimerRef.current) clearTimeout(wedgeTimerRef.current);
    wedgeTimerRef.current = setTimeout(() => {
      const p = resolveCheckInPayload(value);
      if (p?.short_code && value.replace(/[\s-]/g, "").length >= 6) {
        setCode("");
        runCheckIn(p);
      }
    }, 150);
  };

  const handleScannerRaw = (raw: string) => {
    const payload = resolveCheckInPayload(raw);
    if (!payload) {
      toast.error("QR kodni o'qib bo'lmadi");
      return;
    }
    runCheckIn(payload);
  };

  const busy = phase === "submitting" || checkInMut.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.35 }}
      className="rounded-2xl bg-card p-4 shadow-card sm:p-5"
    >
      <CheckInOnboarding className="mb-4" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg",
              phase === "success" ? "bg-foreground text-background" : "bg-muted text-foreground",
            )}
          >
            {phase === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : phase === "scanning" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanLine className="size-4" />
            )}
          </span>
          Mijozni qabul qilish
        </h2>
        <PhasePill phase={phase} scannerOpen={scannerOpen} />
      </div>

      <p className="mb-4 text-xs text-muted-foreground">
        6 xonali kod, kamera QR yoki tashqi skaner — barchasi ishlaydi. Token inputda ko'rinmaydi.
      </p>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (!pasted) return;
            e.preventDefault();
            handleInputChange(pasted);
          }}
          placeholder="Kod yoki skaner natijasi"
          autoCapitalize="characters"
          autoComplete="off"
          disabled={busy}
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm font-semibold uppercase tracking-[0.15em] outline-none transition-colors focus:border-foreground disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserCheck className="size-4" />
          )}
          Qabul
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setScannerOpen(true);
          setPhase("scanning");
        }}
        disabled={busy}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        <ScanLine className="size-4" />
        Kamera bilan QR skaner
      </button>

      <AnimatePresence>
        {scannerOpen ? (
          <CheckInScanner
            open={scannerOpen}
            onClose={() => {
              setScannerOpen(false);
              if (phase === "scanning") setPhase("idle");
            }}
            onDetected={handleScannerRaw}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function PhasePill({ phase, scannerOpen }: { phase: Phase; scannerOpen: boolean }) {
  const label =
    phase === "success"
      ? "Qabul qilindi"
      : phase === "submitting"
        ? "Tekshirilmoqda"
        : scannerOpen || phase === "scanning"
          ? "Skaner ochiq"
          : "Kutish";

  return (
    <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-foreground">
      {label}
    </span>
  );
}
