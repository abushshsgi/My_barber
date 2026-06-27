import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  apiFetch,
  formatFetchError,
  isFetchAbortError,
  RESEND_VERIFICATION_EMAIL_TIMEOUT_MS,
} from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBarberContext } from "@/components/barber/BarberContext";
import { MIN_ACTIVE_SERVICES } from "@/components/barber/BarberContext";
import { SIGNUP_FLOW_PATH } from "@/lib/barber-flow-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/activation")({
  component: BarberActivationPage,
});

type ActivationSteps = {
  email_verified: boolean;
  signup_complete: boolean;
  services_ok: boolean;
  schedule_ok: boolean;
};

function signupFallbackPath(flow: string | null): string {
  const f = (flow || "").trim();
  if (f === "owner" || f === "employee" || f === "mybarber" || f === "independent") {
    return SIGNUP_FLOW_PATH[f];
  }
  return "/salon/join";
}

function computePrimaryNext(
  steps: ActivationSteps,
  requiredNextPath: string | null,
  onboardingFlow: string | null,
  ownsSalon: boolean,
): { to: string; label: string } | null {
  if (!steps.email_verified) {
    return null;
  }
  if (!steps.signup_complete) {
    if (requiredNextPath && !(ownsSalon && requiredNextPath === "/salon/create")) {
      return { to: requiredNextPath, label: "Keyingi qadam: sozlashni yakunlang" };
    }
    if (ownsSalon) {
      if (!steps.services_ok) {
        return {
          to: "/barber/services#activation-services",
          label: "Keyingi qadam: xizmatlarni to‘ldiring",
        };
      }
      if (!steps.schedule_ok) {
        return {
          to: "/barber/schedule",
          label: "Keyingi qadam: ish jadvalini saqlang",
        };
      }
      return null;
    }
    return {
      to: signupFallbackPath(onboardingFlow),
      label: "Keyingi qadam: joylashuv va profil",
    };
  }
  if (!steps.services_ok) {
    return {
      to: "/barber/services#activation-services",
      label: "Keyingi qadam: kamida 5 ta xizmat kiriting",
    };
  }
  if (!steps.schedule_ok) {
    return {
      to: "/barber/schedule",
      label: "Keyingi qadam: ish jadvalini saqlang",
    };
  }
  return null;
}

function BarberActivationPage() {
  const navigate = useNavigate();
  const {
    fullyReady,
    readinessPercent,
    activationSteps,
    activationServicesCount,
    requiredNextPath,
    onboardingFlow,
    ownsSalon,
    profile,
    refreshActivationStatus,
  } = useBarberContext();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // BarberContext allaqachon status yuklaydi; qayta chaqirish loop bermasligi uchun faqat mount.
  useEffect(() => {
    void refreshActivationStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only refresh
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshActivationStatus();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshActivationStatus]);

  const primaryNext = useMemo(
    () => computePrimaryNext(activationSteps, requiredNextPath, onboardingFlow, ownsSalon),
    [activationSteps, requiredNextPath, onboardingFlow, ownsSalon],
  );

  const stepMeta = useMemo(
    () => [
      {
        n: 1,
        ok: activationSteps.email_verified,
        title: "Email",
        body: "Tasdiq havolasi pochtangizga yuboriladi.",
      },
      {
        n: 2,
        ok: activationSteps.signup_complete,
        title: ownsSalon ? "Salon sozlash" : "Ro‘yxatdan o‘tish",
        body: ownsSalon
          ? "Salon yaratildi — xizmatlar va ish jadvalini to‘ldiring."
          : "Salon yoki mustaqil oqim — joylashuv va asosiy ma’lumotlar.",
      },
      {
        n: 3,
        ok: activationSteps.services_ok,
        title: "Xizmatlar",
        body: activationSteps.services_ok
          ? `Kamida ${MIN_ACTIVE_SERVICES} ta faol xizmat — bajarildi (${activationServicesCount} ta).`
          : `Kamida ${MIN_ACTIVE_SERVICES} ta faol xizmat kerak. Serverda hozir: ${activationServicesCount} ta. Xizmatlar sahifasida narx kiriting va saqlang.`,
      },
      {
        n: 4,
        ok: activationSteps.schedule_ok,
        title: "Ish jadvali",
        body: "Kamida bitta ish kuni ochiq va jadval saqlangan.",
      },
    ],
    [activationSteps, activationServicesCount, ownsSalon],
  );

  const activeIndex = useMemo(() => {
    const i = stepMeta.findIndex((s) => !s.ok);
    return i === -1 ? stepMeta.length : i;
  }, [stepMeta]);

  const goPrimary = (raw: string) => {
    const hashIdx = raw.indexOf("#");
    if (hashIdx === -1) {
      void navigate({ to: raw });
      return;
    }
    const path = raw.slice(0, hashIdx);
    const hash = raw.slice(hashIdx + 1);
    void navigate({ to: path });
    window.setTimeout(() => {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${hash}`,
      );
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const onResend = async () => {
    setResending(true);
    try {
      const res = await apiFetch("/api/v1/barber/auth/resend-verification-email/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        timeoutMs: RESEND_VERIFICATION_EMAIL_TIMEOUT_MS,
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        toast.error(extractApiError(body, "Tasdiq xatini yuborib bo‘lmadi.", res));
        return;
      }
      toast.success(
        typeof body === "object" && body && "detail" in body
          ? String((body as { detail?: string }).detail || "Tasdiq xati yuborildi")
          : "Tasdiq xati yuborildi. Pochtadagi havolani bosing.",
      );
      void navigate({
        to: "/check-email",
        search: profile.email ? { email: profile.email } : {},
      });
    } catch (e: unknown) {
      if (isFetchAbortError(e)) {
        toast.error(
          "Javob juda uzoqqa cho‘zilmoqda. Bir ozdan keyin qayta urinib ko‘ring; muammo davom etsa, SMTP (email) server sozlamalarini tekshiring.",
        );
        return;
      }
      toast.error(formatFetchError(e, "Tasdiq xatini yuborishda xatolik."));
    } finally {
      setResending(false);
    }
  };

  const onRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await refreshActivationStatus();
      toast.success("Holat yangilandi");
    } finally {
      setRefreshing(false);
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
        <h1 className="font-heading text-xl font-semibold tracking-tight">Profil tayyorligi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Barcha qadamlarni shu yerda bajaring. Dashboarddagi alohida «profilni to‘ldiring» bloklari
          olib tashlangan — yo‘l-yo‘riq faqat shu sahifada.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Umumiy tayyorlik</span>
          <span>{readinessPercent}%</span>
        </div>
        <Progress value={readinessPercent} className="h-2" />
      </div>

      {!activationSteps.email_verified ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Emailni tasdiqlang</p>
          <p className="mt-1 text-muted-foreground">
            Quyidagi tugma orqali tasdiq xatini yuboring, so‘ng pochtangizdagi havolani bosing.
            Havolada uzun <span className="font-medium">token=...</span> bo‘lishi kerak.
          </p>
          <Link to="/check-email" search={profile.email ? { email: profile.email } : {}} className="mt-2 inline-block text-sm text-primary underline">
            Pochtani qanday tekshirish
          </Link>
        </div>
      ) : null}

      <ol className="space-y-3">
        {stepMeta.map((step, idx) => {
          const isCurrent = idx === activeIndex && !step.ok;
          return (
            <li
              key={step.n}
              className={cn(
                "flex gap-3 rounded-xl border p-4 transition-colors",
                step.ok && "border-emerald-500/25 bg-emerald-500/[0.06]",
                isCurrent && "border-primary/50 bg-primary/[0.06] ring-1 ring-primary/20",
                !step.ok && !isCurrent && "border-border bg-card opacity-80",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-heading font-semibold",
                  step.ok
                    ? "border-emerald-600/40 bg-emerald-600 text-white"
                    : "border-muted-foreground/25 bg-muted text-foreground",
                )}
              >
                {step.ok ? <Check className="size-4" strokeWidth={3} /> : step.n}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{step.title}</span>
                  {isCurrent ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      navbat
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 pt-2">
        {!activationSteps.email_verified ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => void onResend()}
            disabled={resending}
          >
            {resending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            <span className="ml-2">Tasdiq xatini yuborish</span>
          </Button>
        ) : primaryNext ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => goPrimary(primaryNext.to)}
          >
            {primaryNext.label}
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={refreshing}
            onClick={() => void onRefreshStatus()}
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Holatni yangilash (hammasi bajarilgan bo‘lsa)"
            )}
          </Button>
        )}

        {!activationSteps.email_verified ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={refreshing}
            onClick={() => void onRefreshStatus()}
          >
            {refreshing ? <Loader2 className="size-4 animate-spin" /> : null}
            <span className={refreshing ? "ml-2" : ""}>Tasdiqlangach holatni yangilash</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
