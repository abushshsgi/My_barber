import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, Loader2, MapPin, Navigation, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getBarberAccessToken } from "@/lib/api";
import { readSignupDraft } from "@/lib/signup-draft";
import { submitFlowSignup } from "@/lib/barber-signup-flow";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding/employee")({
  component: EmployeeOnboardingPage,
});

/** Signup bosqichi: akkaunt backendda yaratiladi + JWT yoziladi — keyin salon/join ishlaydi. */
function EmployeeOnboardingPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [latLng, setLatLng] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "locating" | "error">("idle");
  const [locError, setLocError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (getBarberAccessToken()) {
      void navigate({ to: "/salon/join", replace: true });
      return;
    }
    const draft = readSignupDraft();
    if (!draft || draft.flow !== "employee") {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    setChecking(false);
  }, [navigate]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("error");
      setLocError("Brauzer geolokatsiyani qo'llab-quvvatlamaydi.");
      return;
    }
    setLocStatus("locating");
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatLng({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocStatus("idle");
      },
      () => {
        setLocStatus("error");
        setLocError("Lokatsiya olinmadi. GPS va ruxsatni tekshiring.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const handleContinue = async () => {
    const draft = readSignupDraft();
    if (!draft || draft.flow !== "employee") {
      toast.error("Ma'lumot topilmadi. Qaytadan ro'yxatdan o'ting.");
      await navigate({ to: "/auth" });
      return;
    }
    if (!latLng) {
      setSubmitError("Avval lokatsiya olish kerak.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitFlowSignup("employee", {
        latitude: latLng.latitude,
        longitude: latLng.longitude,
      });
      toast.success("Akkaunt tayyor. Endi saloningizni qidirishingiz mumkin.");
      await navigate({ to: "/salon/join", replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ro'yxatdan o'tishda xatolik.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground sm:pb-28">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground sm:h-8 sm:w-8">
              <UserRoundCheck className="h-3.5 w-3.5 text-background sm:h-4 sm:w-4" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight sm:text-sm">Ishchi — ro‘yxatdan o‘tish</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[920px] px-3.5 pt-8 sm:px-6 sm:pt-14">
        <section className="rounded-2xl border border-border bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-7">
          <div className="mb-4 flex items-start gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background shadow-[var(--shadow-soft)]">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-[10px]">
                Ketma-ketlikda 1-qadam
              </div>
              <h2 className="text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
                Akkauntingizni yaratish
              </h2>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground sm:text-sm">
                Backend barber uchun joriy joylashuv kerak — keyingi sahifada saloningizni qidirasiz va 100 m tekshiruvi
                ishlaganida join qilasiz.
              </p>
            </div>
          </div>

          <Alert className="border-border bg-muted/30">
            <UserRoundCheck className="h-4 w-4" />
            <AlertTitle>Nima bo‘layapti?</AlertTitle>
            <AlertDescription>
              Signup formasi faqat vaqtinchalik saqlangan edi; bu sahifada ro‘yxatdan o‘tish serverda tugaydi va sizda JWT
              paydo bo‘ladi — shundan keyin Salon Join qidiruvi ishlaydi.
            </AlertDescription>
          </Alert>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={requestLocation}
              disabled={locStatus === "locating"}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-[var(--transition-smooth)]",
                locStatus === "locating"
                  ? "cursor-not-allowed opacity-70"
                  : "cursor-pointer hover:bg-muted active:scale-[0.98]",
              )}
            >
              {locStatus === "locating" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Navigation className="h-4 w-4" />
              )}
              {latLng ? "Lokatsiyani yangilash" : "Mening joylashuvim"}
            </button>
          </div>

          {locError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Joylashuv</AlertTitle>
              <AlertDescription>{locError}</AlertDescription>
            </Alert>
          )}

          {latLng && (
            <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-sm tabular-nums text-muted-foreground">
              Koordinatalar: {latLng.latitude.toFixed(6)}, {latLng.longitude.toFixed(6)}
            </div>
          )}

          {submitError && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Xato</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={!latLng || submitting}
            className={cn(
              "mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-[var(--transition-smooth)] sm:w-auto sm:min-w-[220px]",
              latLng && !submitting
                ? "cursor-pointer bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                : "cursor-not-allowed bg-muted text-muted-foreground",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Yuklanmoqda...
              </>
            ) : (
              <>
                Davom etish — salon qidirish
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </section>
      </main>
    </div>
  );
}
