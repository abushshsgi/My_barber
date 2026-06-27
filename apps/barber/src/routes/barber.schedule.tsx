import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WorkingHoursEditor } from "@/components/barber/WorkingHoursEditor";
import { ScheduleExceptionsEditor } from "@/components/barber/ScheduleExceptionsEditor";
import { PageHeader, SectionCard } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { invalidateOnboardingAfterActivationChange } from "@/lib/onboarding-status-cache";
import {
  applyHours,
  defaultDays,
  parseBreaks,
  serializeScheduleDays,
  type ApiWorkingHour,
  type DayForm,
  type ScheduleMembership,
} from "@/lib/barber-schedule";
import { apiFetch, apiList, formatApiError } from "@/lib/api";
import { SIGNUP_FLOW_PATH } from "@/lib/barber-flow-config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barber/schedule")({
  component: BarberSchedulePage,
});

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return formatApiError(body, fallback);
}

function BarberSchedulePage() {
  const {
    profile,
    viewMode,
    activeSalonId,
    refreshActivationStatus,
    activationSteps,
    fullyReady,
  } = useBarberContext();
  const scope = viewMode === "salon" && activeSalonId ? "salon" : "independent";
  const barberId = Number(profile.id);

  const [days, setDays] = useState<DayForm[]>(defaultDays);
  const [membershipId, setMembershipId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const committedRef = useRef<string | null>(null);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      let nextDays: DayForm[];
      if (scope === "salon") {
        const memberships = await apiList<ScheduleMembership>(
          `/api/v1/memberships/?salon=${activeSalonId}`,
        );
        const ownMembership = memberships.find((m) => m.barber === barberId) ?? null;
        setMembershipId(ownMembership?.id ?? null);
        const scheduleRows = ownMembership
          ? await apiList<ApiWorkingHour>(`/api/v1/schedules/?membership=${ownMembership.id}`)
          : [];
        nextDays = applyHours(scheduleRows);
      } else {
        setMembershipId(null);
        const scheduleRows = await apiList<ApiWorkingHour>("/api/v1/barber/working-hours/");
        nextDays = applyHours(scheduleRows);
      }
      setDays(nextDays);
      committedRef.current = serializeScheduleDays(nextDays);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Jadvalni yuklab bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, activeSalonId, barberId]);

  const saveSchedule = async () => {
    if (scope === "salon" && !membershipId) {
      toast.error("Salon membership topilmadi. Avval salon bilan ulanishni yakunlang.");
      return;
    }
    setSaving(true);
    try {
      const breaksByDay: { day: DayForm; breaks: ReturnType<typeof parseBreaks> }[] = [];
      for (const day of days) {
        try {
          breaksByDay.push({ day, breaks: parseBreaks(day.breaksText) });
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Jadvalni tekshiring.");
          return;
        }
      }
      const base = scope === "salon" ? "/api/v1/schedules" : "/api/v1/barber/working-hours";
      const responses = await Promise.all(
        breaksByDay.map(({ day, breaks }) => {
          const body = {
            weekday: day.weekday,
            open_time: day.open_time,
            close_time: day.close_time,
            is_day_off: day.is_day_off,
            breaks,
            ...(scope === "salon" ? { membership: membershipId } : {}),
          };
          return apiFetch(day.id ? `${base}/${day.id}/` : `${base}/`, {
            method: day.id ? "PATCH" : "POST",
            body: JSON.stringify(body),
          });
        }),
      );
      for (const res of responses) {
        if (!res.ok) {
          toast.error(await parseError(res, "Jadvalni saqlab bo'lmadi."));
          void loadSchedule();
          return;
        }
      }
      toast.success("Ish jadvali saqlandi.");
      invalidateOnboardingAfterActivationChange();
      await loadSchedule();
      await refreshActivationStatus();
    } finally {
      setSaving(false);
    }
  };

  const blocker = useBlocker({
    shouldBlockFn: useCallback(() => {
      if (loading || saving) return false;
      if (committedRef.current === null) return false;
      return serializeScheduleDays(days) !== committedRef.current;
    }, [loading, saving, days]),
    withResolver: true,
    enableBeforeUnload: true,
    disabled: loading,
  });

  const scheduleBlocked = scope === "salon" && !membershipId;

  return (
    <>
      <div className="mx-auto max-w-[820px] space-y-6 p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Ish jadvali"
          description={
            scope === "salon"
              ? "Salon ichidagi shaxsiy ish vaqtingiz — dam kunlari va tanaffuslar booking slotlariga ta'sir qiladi."
              : "Mustaqil booking uchun haftalik ish vaqtingizni sozlang."
          }
          actions={
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {scope === "salon" ? "Salon jadvali" : "Mustaqil"}
            </div>
          }
        />

        {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
          <div className="rounded-xl border border-primary/35 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <span className="font-medium">Profil tayyorligi:</span> jadvalni to&apos;ldiring va{" "}
            <span className="font-medium">Saqlash</span> ni bosing, so&apos;ng aktivatsiya sahifasiga
            qayting.
          </div>
        ) : null}

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-card">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <SectionCard
            title="Haftalik jadval"
            description="Har bir kun uchun ish vaqti, dam olish va tanaffuslarni boshqaring."
            actions={
              <Button
                type="button"
                onClick={() => void saveSchedule()}
                disabled={saving || scheduleBlocked}
                className="rounded-lg"
              >
                {saving ? "Saqlanmoqda..." : "Jadvalni saqlash"}
              </Button>
            }
          >
            {scheduleBlocked ? (
              <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
                <p className="font-medium text-amber-950 dark:text-amber-100">
                  Ish jadvalini saqlash uchun salon a&apos;zoligi kerak
                </p>
                <p className="mt-1 text-muted-foreground">
                  Taklifni qabul qiling yoki salonga qo&apos;shiling — shundan keyin jadval serverga
                  yoziladi.
                </p>
                <Link
                  to={SIGNUP_FLOW_PATH.employee}
                  className="mt-2 inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-90"
                >
                  Salonga qo&apos;shilish
                </Link>
              </div>
            ) : null}
            <WorkingHoursEditor
              days={days}
              onChange={setDays}
              disabled={scheduleBlocked || saving}
            />
          </SectionCard>
        )}

        {!loading ? (
          <SectionCard
            title="Maxsus kunlar"
            description="Muayyan sana uchun dam olish, maxsus ish soati yoki bir martalik tanaffus belgilang — bu haftalik jadvaldan ustun turadi."
          >
            <ScheduleExceptionsEditor
              scope={scope}
              membershipId={membershipId}
              disabled={scheduleBlocked || saving}
            />
          </SectionCard>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          <Link
            to="/barber/services"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Xizmatlar sahifasiga qaytish
          </Link>
        </p>
      </div>

      <AlertDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Saqlanmagan o&apos;zgarishlar</AlertDialogTitle>
            <AlertDialogDescription>
              Sahifadan chiqsangiz, kiritilgan jadval o&apos;zgarishlari yo&apos;qolishi mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => blocker.reset?.()}>
              Sahifada qolish
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => blocker.proceed?.()}
            >
              Chiqish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
