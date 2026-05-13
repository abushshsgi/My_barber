import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBarberContext } from "@/components/barber/BarberContext";

export const Route = createFileRoute("/barber/activation")({
  component: BarberActivationPage,
});

function BarberActivationPage() {
  const {
    fullyReady,
    readinessPercent,
    activationSteps,
    requiredNextPath,
    bookingSetup,
    refreshActivationStatus,
  } = useBarberContext();
  const [resending, setResending] = useState(false);

  useEffect(() => {
    void refreshActivationStatus();
  }, [refreshActivationStatus]);

  const onResend = async () => {
    setResending(true);
    try {
      const res = await apiFetch("/api/v1/barber/auth/resend-verification-email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error((j as { detail?: string }).detail || "Yuborib bo‘lmadi");
        return;
      }
      toast.success("Tasdiq xati yuborildi");
    } finally {
      setResending(false);
    }
  };

  if (fullyReady) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4">
        <div className="rounded-xl border bg-card p-6 text-center">
          <Sparkles className="size-10 mx-auto text-emerald-600 mb-3" />
          <h1 className="font-heading text-lg font-semibold">Profil 100% tayyor</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Endi barcha bo‘limlar va mijozlarga ko‘rinish ochiq.
          </p>
          <Button asChild className="mt-4">
            <Link to="/barber">Dashboardga</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight">Profilni tugating</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Booking va panelning barcha qismlari faqat 100% tayyorgarlikdan keyin ochiladi.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Jarayon</span>
          <span>{readinessPercent}%</span>
        </div>
        <Progress value={readinessPercent} className="h-2" />
      </div>

      <ul className="rounded-xl border bg-card divide-y">
        <StepRow ok={activationSteps.email_verified} label="Email tasdiqlangan" />
        <StepRow
          ok={activationSteps.signup_complete}
          label="Ro‘yxatdan o‘tish (salon / joylashuv)"
        />
        <StepRow
          ok={activationSteps.services_ok}
          label={`Kamida 5 ta xizmat (${bookingSetup.hasServices ? "OK" : "yetarli emas"})`}
        />
        <StepRow ok={activationSteps.schedule_ok} label="Ish jadvali kiritilgan" />
      </ul>

      <div className="flex flex-col sm:flex-row gap-3">
        {!activationSteps.email_verified && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void onResend()}
            disabled={resending}
          >
            {resending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            <span className="ml-2">Emailni qayta yuborish</span>
          </Button>
        )}
        {requiredNextPath ? (
          <Button asChild variant="default">
            <Link to={requiredNextPath}>Keyingi qadam</Link>
          </Button>
        ) : null}
        <Button asChild variant="secondary">
          <Link to="/barber/services">Xizmatlar va jadval</Link>
        </Button>
      </div>
    </div>
  );
}

function StepRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <span
        className={
          ok
            ? "size-2 rounded-full bg-emerald-500 shrink-0"
            : "size-2 rounded-full bg-muted-foreground/30 shrink-0"
        }
      />
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
