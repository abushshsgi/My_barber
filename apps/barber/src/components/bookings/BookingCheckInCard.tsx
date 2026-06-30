import { motion } from "framer-motion";
import { Loader2, ScanLine, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseCheckInQrPayload } from "@mybarber/shared/booking-lifecycle";
import { CheckInScanner } from "@/components/bookings/CheckInScanner";
import { useCheckInByTokenMutation } from "@/hooks/use-barber-queries";

export function BarberManualCheckInCard({ onCheckedIn }: { onCheckedIn?: () => void }) {
  const [code, setCode] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const checkInMut = useCheckInByTokenMutation();

  const runCheckIn = (payload: { token?: string; short_code?: string }) => {
    checkInMut.mutate(payload, {
      onSuccess: () => {
        toast.success("Mijoz qabul qilindi");
        setCode("");
        setScannerOpen(false);
        onCheckedIn?.();
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const submit = () => {
    const raw = code.trim();
    if (!raw) {
      toast.error("Mijoz kodini kiriting");
      return;
    }
    const token = parseCheckInQrPayload(raw);
    runCheckIn(token && token.length > 12 ? { token } : { short_code: raw.toUpperCase() });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.35 }}
      className="rounded-2xl bg-card p-4 shadow-card sm:p-5"
    >
      <h2 className="mb-1 flex items-center gap-2 font-heading text-base font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-muted text-foreground">
          <ScanLine className="size-4" />
        </span>
        Mijozni qabul qilish
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Mijoz ilovasidagi QR yoki bir martalik kodni kiriting. Kod bir marta ishlatiladi.
      </p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Masalan: 7F3A9K"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm font-semibold uppercase tracking-[0.2em] outline-none transition-colors focus:border-foreground"
        />
        <button
          type="button"
          onClick={submit}
          disabled={checkInMut.isPending}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {checkInMut.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserCheck className="size-4" />
          )}
          Qabul
        </button>
      </div>
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        disabled={checkInMut.isPending}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        <ScanLine className="size-4" />
        QR kodni skaner qilish
      </button>

      <CheckInScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={(token) => runCheckIn({ token })}
      />
    </motion.div>
  );
}
