import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ScanLine, UserCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  hasWrongKeyboardLayoutInput,
  isCompleteCheckInScannerInput,
  resolveCheckInPayload,
} from "@mybarber/shared/booking-lifecycle";
import { CheckInScanner } from "@/components/bookings/CheckInScanner";
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

/** Inline QR qabul — onboarding va alohida sahifa yo'q. */
export function BookingQrCheckInPanel({ onCheckedIn }: { onCheckedIn?: () => void }) {
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
        const msg = "Kod to'liq emas. QR ni qayta skaner qiling yoki Enter bosing.";
        setLastError(msg);
        setPhase("error");
        toast.error(msg);
        window.setTimeout(() => setPhase("idle"), 2500);
        return;
      }
      const payload = resolveCheckInPayload(trimmed);
      if (!payload) {
        const msg = "Kod o'qilmadi. QR to'liq skaner qiling yoki 6 xonali kodni yozing.";
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
        if (isCompleteCheckInScannerInput(raw)) submitRaw(raw);
      }, WEDGE_IDLE_MS);
    },
    [submitRaw],
  );

  const submitFromInput = () => submitRaw(inputRef.current?.value ?? "");

  const handleInputChange = () => {
    const v = inputRef.current?.value ?? "";
    setLastError(null);
    if (!v.length) {
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
        isCompleteCheckInScannerInput(v) ? "QR to'liq — tekshirilmoqda…" : "QR skanerlanmoqda…",
      );
      scheduleWedgeSubmit(v);
      return;
    }
    setInputHint(v.length >= 4 ? `${v.replace(/[\s-]/g, "").length}/6 xonali kod` : null);
    if (v.replace(/[\s-]/g, "").length >= 6) scheduleWedgeSubmit(v);
  };

  const busy = phase === "submitting" || checkInMut.isPending;

  if (phase === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center rounded-3xl border border-foreground/10 bg-card px-8 py-12 text-center shadow-card"
      >
        <div className="grid size-16 place-items-center rounded-full bg-foreground text-background">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-5 font-heading text-xl font-semibold">Mijoz qabul qilindi</h2>
        <p className="mt-2 text-sm text-muted-foreground">Xizmat boshlanmoqda…</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-border bg-card p-6 shadow-card sm:p-8"
    >
      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "grid size-14 place-items-center rounded-2xl",
            phase === "error" ? "bg-destructive/15 text-destructive" : "bg-muted text-foreground",
          )}
        >
          {phase === "error" ? (
            <AlertCircle className="size-6" />
          ) : busy ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <ScanLine className="size-6" />
          )}
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold">Mijozni QR bilan tasdiqlang</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Mijoz ilovasidagi QR kodni skaner qiling yoki 6 xonali kodni kiriting.
        </p>
      </div>

      {lastError ? (
        <div className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {lastError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setScannerOpen(true);
          setPhase("scanning");
        }}
        disabled={busy}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-base font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <ScanLine className="size-5" />
        QR kodni skaner qilish
      </button>

      <div className="mt-4 flex gap-2">
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
            placeholder="6 xonali kod yoki skaner"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-background px-4 py-3.5 font-mono text-sm font-semibold tracking-wide outline-none transition-colors focus:border-foreground disabled:opacity-60"
          />
          {inputHint ? <p className="mt-1 text-[11px] text-muted-foreground">{inputHint}</p> : null}
        </div>
        <button
          type="button"
          onClick={submitFromInput}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted px-5 py-3.5 text-sm font-semibold transition-colors hover:bg-muted/80 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
          Qabul
        </button>
      </div>

      <AnimatePresence>
        {scannerOpen ? (
          <CheckInScanner
            open={scannerOpen}
            onClose={() => {
              setScannerOpen(false);
              if (phase === "scanning") setPhase("idle");
            }}
            onDetected={(raw) => submitRaw(raw)}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
