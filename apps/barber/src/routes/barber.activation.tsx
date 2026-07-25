import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
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

function activationRedirectPath(_ownsSalon: boolean): string {
  return "/barber";
}

function BarberActivationPage() {
  const navigate = useNavigate();
  const {
    fullyReady,
    activationHydrated,
    readinessPercent,
    activationSteps,
    activationServicesCount,
    requiredNextPath,
    onboardingFlow,
    ownsSalon,
    refreshActivationStatus,
  } = useBarberContext();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!activationHydrated || !fullyReady) return;
    void navigate({ to: activationRedirectPath(ownsSalon), replace: true });
  }, [activationHydrated, fullyReady, ownsSalon, navigate]);

  const primaryNext = useMemo(
    () => computePrimaryNext(activationSteps, requiredNextPath, onboardingFlow, ownsSalon),
    [activationSteps, requiredNextPath, onboardingFlow, ownsSalon],
  );

  const stepMeta = useMemo(
    () => [
      {
        n: 1,
        ok: activationSteps.signup_complete,
        title: ownsSalon ? "Salon sozlash" : "Ro‘yxatdan o‘tish",
        body: ownsSalon
          ? "Salon yaratildi — xizmatlar va ish jadvalini to‘ldiring."
          : "Salon yoki mustaqil oqim — joylashuv va asosiy ma’lumotlar.",
      },
      {
        n: 2,
        ok: activationSteps.services_ok,
        title: "Xizmatlar",
        body: activationSteps.services_ok
          ? `Kamida ${MIN_ACTIVE_SERVICES} ta faol xizmat — bajarildi (${activationServicesCount} ta).`
          : `Kamida ${MIN_ACTIVE_SERVICES} ta faol xizmat kerak. Serverda hozir: ${activationServicesCount} ta. Xizmatlar sahifasida narx kiriting va saqlang.`,
      },
      {
        n: 3,
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

  const onRefreshStatus = async () => {
    setRefreshing(true);
    try {
      const { fullyReady: ready } = await refreshActivationStatus();
      if (ready) {
        toast.success("Profil tayyor — dashboardga yo‘naltirilmoqda");
        void navigate({ to: activationRedirectPath(ownsSalon), replace: true });
        return;
      }
      toast.success("Holat yangilandi");
    } finally {
      setRefreshing(false);
    }
  };

  if (!activationHydrated || fullyReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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
        {primaryNext ? (
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
      </div>
    </div>
  );
}
