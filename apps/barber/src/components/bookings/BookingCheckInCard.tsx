import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ScanLine, UserCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { resolveCheckInPayload, hasWrongKeyboardLayoutInput, isCompleteCheckInScannerInput } from "@mybarber/shared/booking-lifecycle";
import { CheckInScanner } from "@/components/bookings/CheckInScanner";
import { CheckInOnboarding } from "@/components/bookings/CheckInOnboarding";
import { useCheckInByTokenMutation } from "@/hooks/use-barber-queries";
import { cn } from "@/lib/utils";

type Phase = "idle" | "scanning" | "submitting" | "success" | "error";

const WEDGE_IDLE_MS = 450;

function mapCheckInError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("topilmadi") || m.includes("not found")) {
    return "Kod topilmadi. Mijoz ilovasidagi yangi QR yoki 6 xonali kodni skaner qiling.";
  }
  if (m.includes("allaqachon") || m.includes("ishlatilgan") || m.includes("410")) {
    return "Bu kod allaqachon ishlatilgan. Mijozdan yangi QR so'rang.";
  }
  if (m.includes("tegishli emas") || m.includes("403")) {
    return "Bu bron boshqa sartaroshga tegishli.";
  }
  if (m.includes("tasdiqlangan")) {
    return "Faqat tasdiqlangan bron uchun check-in qilinadi.";
  }
  return message || "Check-in bajarilmadi";
}

export function BarberManualCheckInCard({ onCheckedIn }: { onCheckedIn?: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [inputHint, setInputHint] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wedgeTimerRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const checkInMut = useCheckInByTokenMutation();

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (wedgeTimerRef.current) window.clearTimeout(wedgeTimerRef.current);
    };
  }, []);

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
    setInputHint(null);
  };

  const runCheckIn = useCallback(
    (payload: { token?: string; short_code?: string }) => {
      if (submittingRef.current || checkInMut.isPending) return;
      submittingRef.current = true;
      setPhase("submitting");
      setLastError(null);
      checkInMut.mutate(payload, {
        onSuccess: () => {
          submittingRef.current = false;
          setPhase("success");
          clearInput();
          setScannerOpen(false);
          toast.success("Mijoz qabul qilindi");
          onCheckedIn?.();
          window.setTimeout(() => setPhase("idle"), 1200);
        },
        onError: (e) => {
          submittingRef.current = false;
          const msg = mapCheckInError(e.message);
          setLastError(msg);
          setPhase("error");
          toast.error(msg);
          window.setTimeout(() => setPhase("idle"), 2500);
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
      if (hasWrongKeyboardLayoutInput(trimmed)) {
        const msg =
          "Klaviatura ingliz (EN) tilida emas. Windows tilini EN qilib, qayta skaner qiling.";
        setLastError(msg);
        setPhase("error");
        toast.error(msg);
        window.setTimeout(() => setPhase("idle"), 3000);
        return;
      }
      if (!isCompleteCheckInScannerInput(trimmed)) {
        const msg =
          "Kod to'liq emas. QR ni qayta skaner qiling yoki Enter bosing.";
        setLastError(msg);
        setPhase("error");
        toast.error(msg);
        window.setTimeout(() => setPhase("idle"), 2500);
        return;
      }
      const payload = resolveCheckInPayload(trimmed);
      if (!payload) {
        const msg =
          "Kod o'qilmadi. QR to'liq skaner qiling yoki 6 xonali kodni yozing.";
        setLastError(msg);
        setPhase("error");
        toast.error(msg);
        window.setTimeout(() => setPhase("idle"), 2500);
        return;
      }
      runCheckIn(payload);
    },
    [runCheckIn],
  );

  const scheduleWedgeSubmit = useCallback(
    (raw: string) => {
      if (wedgeTimerRef.current) window.clearTimeout(wedgeTimerRef.current);
      wedgeTimerRef.current = window.setTimeout(() => {
        wedgeTimerRef.current = null;
        if (isCompleteCheckInScannerInput(raw)) {
          submitRaw(raw);
        }
      }, WEDGE_IDLE_MS);
    },
    [submitRaw],
  );

  const submitFromInput = () => {
    const raw = inputRef.current?.value ?? "";
    submitRaw(raw);
  };

  const handleInputChange = () => {
    const v = inputRef.current?.value ?? "";
    setLastError(null);
    if (v.length === 0) {
      setInputHint(null);
      return;
    }

    if (hasWrongKeyboardLayoutInput(v)) {
      setInputHint("Klaviatura EN (ingliz) tilida bo'lishi kerak");
      return;
    }

    const lower = v.toLowerCase();
    if (lower.includes("mybarber") || v.length > 10) {
      setInputHint(
        isCompleteCheckInScannerInput(v)
          ? "QR to'liq — tekshirilmoqda…"
          : "QR skanerlanmoqda…",
      );
      scheduleWedgeSubmit(v);
      return;
    }

    setInputHint(v.length >= 4 ? `${v.replace(/[\s-]/g, "").length}/6 xonali kod` : null);
    if (v.replace(/[\s-]/g, "").length >= 6) {
      scheduleWedgeSubmit(v);
    }
  };

  const handleScannerRaw = (raw: string) => {
    submitRaw(raw);
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
              phase === "success"
                ? "bg-foreground text-background"
                : phase === "error"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-foreground",
            )}
          >
            {phase === "success" ? (
              <CheckCircle2 className="size-4" />
            ) : phase === "error" ? (
              <AlertCircle className="size-4" />
            ) : phase === "scanning" || busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ScanLine className="size-4" />
            )}
          </span>
          Mijozni qabul qilish
        </h2>
        <PhasePill phase={phase} scannerOpen={scannerOpen} />
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        Tashqi skaner: maydonga fokus qiling va QR ni skaner qiling. Klaviatura{" "}
        <span className="font-semibold text-foreground">ingliz (EN)</span> tilida bo'lsin.
        Qo'lda: 6 xonali kod + Enter yoki Qabul.
      </p>

      {lastError ? (
        <div className="mb-3 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
          {lastError}
        </div>
      ) : null}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            defaultValue=""
            lang="en"
            inputMode="text"
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                if (wedgeTimerRef.current) {
                  window.clearTimeout(wedgeTimerRef.current);
                  wedgeTimerRef.current = null;
                }
                submitFromInput();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (!pasted) return;
              e.preventDefault();
              if (inputRef.current) inputRef.current.value = pasted;
              handleInputChange();
              submitRaw(pasted);
            }}
            placeholder="Skaner yoki 6 xonali kod"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm font-semibold tracking-wide outline-none transition-colors focus:border-foreground disabled:opacity-60"
          />
          {inputHint ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{inputHint}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={submitFromInput}
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
      : phase === "error"
        ? "Xato"
        : phase === "submitting"
          ? "Tekshirilmoqda"
          : scannerOpen || phase === "scanning"
            ? "Kamera ochiq"
            : "Skaner tayyor";

  return (
    <span
      className={cn(
        "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
        phase === "error" ? "bg-destructive/15 text-destructive" : "bg-muted text-foreground",
      )}
    >
      {label}
    </span>
  );
}
