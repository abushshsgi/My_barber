import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { isBarberTokenErrorMessage } from "@/lib/barber-auth-session";

type Props = {
  error: unknown;
  fallback?: string;
};

export function BookingQueryError({ error, fallback = "Bron yuklanmadi" }: Props) {
  const message = error instanceof Error ? error.message : fallback;
  const sessionExpired = isBarberTokenErrorMessage(message);

  if (sessionExpired) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted">
          <LogIn className="size-5 text-foreground" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">Sessiya tugadi</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Xavfsizlik uchun qayta kirishingiz kerak. Ma&apos;lumotlaringiz saqlanadi.
        </p>
        <Link
          to="/auth"
          search={{ session: "expired" }}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background"
        >
          Qayta kirish
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
      {message || fallback}
    </div>
  );
}
