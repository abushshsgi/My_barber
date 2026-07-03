import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { BookingModePanel } from "@/components/barber/BookingModePanel";
import { WorkingHoursEditor } from "@/components/barber/WorkingHoursEditor";
import { ScheduleExceptionsEditor } from "@/components/barber/ScheduleExceptionsEditor";
import { PageHeader } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { invalidateOnboardingAfterActivationChange } from "@/lib/onboarding-status-cache";
import {
  applyHours,
  DEFAULT_BOOKING_SETTINGS,
  defaultDays,
  parseBreaks,
  serializeScheduleDays,
  type ApiWorkingHour,
  type BookingSettings,
  type DayForm,
  type ScheduleMembership,
} from "@/lib/barber-schedule";
import { apiFetch, apiJson, apiList, formatApiError } from "@/lib/api";
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/schedule")({
  component: BarberSchedulePage,
});

type TabId = "mode" | "weekly" | "exceptions";

const TABS: { id: TabId; label: string; icon: typeof CalendarClock }[] = [
  { id: "mode", label: "Bron rejimi", icon: Sparkles },
  { id: "weekly", label: "Haftalik jadval", icon: CalendarClock },
  { id: "exceptions", label: "Maxsus kunlar", icon: CalendarDays },
];

async function parseError(res: Response, fallback: string) {
  const body = await res.json().catch(() => ({}));
  return formatApiError(body, fallback);
}

function serializeBookingSettings(s: BookingSettings): string {
  return JSON.stringify(s);
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

  const [activeTab, setActiveTab] = useState<TabId>("mode");
  const [days, setDays] = useState<DayForm[]>(defaultDays);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>(DEFAULT_BOOKING_SETTINGS);
  const [membershipId, setMembershipId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const committedScheduleRef = useRef<string | null>(null);
  const committedModeRef = useRef<string | null>(null);

  const bookingSettingsUrl = useMemo(() => {
    const base = "/api/v1/barber/booking-settings/";
    if (scope === "salon" && membershipId) {
      return `${base}?membership=${membershipId}`;
    }
    return base;
  }, [scope, membershipId]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      let nextDays: DayForm[];
      let nextMembership: number | null = null;
      if (scope === "salon") {
        const memberships = await apiList<ScheduleMembership>(
          `/api/v1/memberships/?salon=${activeSalonId}`,
        );
        const ownMembership = memberships.find((m) => m.barber === barberId) ?? null;
        nextMembership = ownMembership?.id ?? null;
        setMembershipId(nextMembership);
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
      committedScheduleRef.current = serializeScheduleDays(nextDays);

      if (scope === "salon" && !nextMembership) {
        setBookingSettings(DEFAULT_BOOKING_SETTINGS);
        committedModeRef.current = serializeBookingSettings(DEFAULT_BOOKING_SETTINGS);
      } else {
        const settingsUrl =
          scope === "salon" && nextMembership
            ? `/api/v1/barber/booking-settings/?membership=${nextMembership}`
            : "/api/v1/barber/booking-settings/";
        const settings = await apiJson<BookingSettings>(settingsUrl);
        const merged = { ...DEFAULT_BOOKING_SETTINGS, ...settings };
        setBookingSettings(merged);
        committedModeRef.current = serializeBookingSettings(merged);
      }
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

  const saveBookingMode = async () => {
    if (scheduleBlocked) return;
    setSavingMode(true);
    try {
      const res = await apiFetch(bookingSettingsUrl, {
        method: "PATCH",
        body: JSON.stringify(bookingSettings),
      });
      if (!res.ok) {
        toast.error(await parseError(res, "Bron rejimini saqlab bo'lmadi."));
        return;
      }
      const saved = (await res.json()) as BookingSettings;
      const merged = { ...DEFAULT_BOOKING_SETTINGS, ...saved };
      setBookingSettings(merged);
      committedModeRef.current = serializeBookingSettings(merged);
      toast.success("Bron rejimi saqlandi.");
    } finally {
      setSavingMode(false);
    }
  };

  const saveSchedule = async () => {
    if (scheduleBlocked) {
      toast.error("Salon membership topilmadi. Avval salon bilan ulanishni yakunlang.");
      return;
    }
    setSavingSchedule(true);
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
      setSavingSchedule(false);
    }
  };

  const hasUnsavedSchedule =
    committedScheduleRef.current !== null &&
    serializeScheduleDays(days) !== committedScheduleRef.current;
  const hasUnsavedMode =
    committedModeRef.current !== null &&
    serializeBookingSettings(bookingSettings) !== committedModeRef.current;

  const blocker = useBlocker({
    shouldBlockFn: useCallback(() => {
      if (loading || savingMode || savingSchedule) return false;
      return hasUnsavedSchedule || hasUnsavedMode;
    }, [loading, savingMode, savingSchedule, hasUnsavedSchedule, hasUnsavedMode]),
    withResolver: true,
    enableBeforeUnload: true,
    disabled: loading,
  });

  const scheduleBlocked = scope === "salon" && !membershipId;
  const workingDays = days.filter((d) => !d.is_day_off).length;

  return (
    <>
      <div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.03] via-transparent to-transparent" />
          <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <PageHeader
                title="Ish jadvali"
                description="Bron qabul qilish rejimi, haftalik soatlar va maxsus kunlarni boshqaring."
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                {scope === "salon" ? "Salon jadvali" : "Mustaqil usta"}
              </span>
              {!loading ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
                  {bookingSettings.booking_mode === "advance" ? (
                    <>
                      <CalendarRange className="size-3.5" />
                      Oldindan {bookingSettings.advance_min_days}–{bookingSettings.advance_max_days} kun
                    </>
                  ) : (
                    <>
                      <CalendarClock className="size-3.5" />
                      Har kunlik
                    </>
                  )}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
          <div className="rounded-xl border border-primary/35 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <span className="font-medium">Profil tayyorligi:</span> jadvalni to&apos;ldiring va saqlang,
            so&apos;ng aktivatsiya sahifasiga qayting.
          </div>
        ) : null}

        {scheduleBlocked ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm">
            <p className="font-medium text-amber-950 dark:text-amber-100">
              Salon a&apos;zoligi kerak
            </p>
            <p className="mt-1 text-muted-foreground">
              Taklifni qabul qiling yoki salonga qo&apos;shiling — shundan keyin jadval saqlanadi.
            </p>
            <Link
              to={SIGNUP_FLOW_PATH.employee}
              className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
            >
              Salonga qo&apos;shilish
            </Link>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Ish kunlari" value={String(workingDays)} hint="haftada" />
          <SummaryCard
            label="Bron rejimi"
            value={bookingSettings.booking_mode === "advance" ? "Oldindan" : "Har kunlik"}
            hint={
              bookingSettings.booking_mode === "advance"
                ? `${bookingSettings.advance_min_days}–${bookingSettings.advance_max_days} kun`
                : "bugundan"
            }
          />
          <SummaryCard label="Tanaffus" value="Tushlik" hint="har ish kunida" />
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/30 p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const dirty =
              (tab.id === "mode" && hasUnsavedMode) ||
              (tab.id === "weekly" && hasUnsavedSchedule);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
                {dirty ? <span className="size-1.5 rounded-full bg-foreground" /> : null}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex h-72 items-center justify-center rounded-2xl border border-border bg-card">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
            {activeTab === "mode" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Qanday bron qabul qilasiz?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Mijozlar faqat siz tanlagan rejim va jadval bo&apos;yicha buyurtma bera oladi.
                  </p>
                </div>
                <BookingModePanel
                  settings={bookingSettings}
                  onChange={setBookingSettings}
                  disabled={scheduleBlocked || savingMode}
                />
                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    type="button"
                    onClick={() => void saveBookingMode()}
                    disabled={scheduleBlocked || savingMode || !hasUnsavedMode}
                    className="gap-2 rounded-xl"
                  >
                    {savingMode ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Rejimni saqlash
                  </Button>
                </div>
              </div>
            ) : null}

            {activeTab === "weekly" ? (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-heading text-lg font-semibold">Haftalik ish vaqti</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Har kunning ochilish/yopilish vaqti va tushlik tanaffusi. Mijozlar faqat shu
                      oralig&apos;da bron qiladi.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void saveSchedule()}
                    disabled={scheduleBlocked || savingSchedule}
                    className="shrink-0 gap-2 rounded-xl"
                  >
                    {savingSchedule ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    Jadvalni saqlash
                  </Button>
                </div>
                <WorkingHoursEditor
                  days={days}
                  onChange={setDays}
                  disabled={scheduleBlocked || savingSchedule}
                />
              </div>
            ) : null}

            {activeTab === "exceptions" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Maxsus kunlar</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dam olish, qisqa kun yoki qo&apos;shimcha tanaffus — haftalik jadvaldan ustun.
                  </p>
                </div>
                <ScheduleExceptionsEditor
                  scope={scope}
                  membershipId={membershipId}
                  disabled={scheduleBlocked || savingSchedule}
                />
              </div>
            ) : null}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/barber/calendar" className="font-medium text-foreground hover:underline">
            Kalendarda bronlarni ko&apos;rish
          </Link>
          {" · "}
          <Link to="/barber/services" className="font-medium text-foreground hover:underline">
            Xizmatlar
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

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-card">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-xl font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
