import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AdvanceDayPlanner } from "@/components/barber/AdvanceDayPlanner";
import { BookingModePanel } from "@/components/barber/BookingModePanel";
import { WorkingHoursEditor } from "@/components/barber/WorkingHoursEditor";
import { ScheduleExceptionsEditor } from "@/components/barber/ScheduleExceptionsEditor";
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

type TabId = "mode" | "weekly" | "advance" | "exceptions";

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
      if (merged.booking_mode === "advance") setActiveTab("advance");
    } finally {
      setSavingMode(false);
    }
  };

  const saveSchedule = async () => {
    if (scheduleBlocked) {
      toast.error("Salon membership topilmadi.");
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
  const isAdvance = bookingSettings.booking_mode === "advance";
  const workingDays = days.filter((d) => !d.is_day_off).length;

  const tabs = useMemo(() => {
    const base: { id: TabId; label: string; icon: typeof Sparkles }[] = [
      { id: "mode", label: "Bron rejimi", icon: Sparkles },
      {
        id: "weekly",
        label: isAdvance ? "Haftalik shablon" : "Haftalik jadval",
        icon: CalendarClock,
      },
    ];
    if (isAdvance) {
      base.push({ id: "advance", label: "Oldindan kunlar", icon: CalendarRange });
    } else {
      base.push({ id: "exceptions", label: "Maxsus kunlar", icon: CalendarDays });
    }
    return base;
  }, [isAdvance]);

  const activeSave =
    activeTab === "mode"
      ? { label: "Rejimni saqlash", onClick: () => void saveBookingMode(), saving: savingMode, disabled: !hasUnsavedMode }
      : activeTab === "weekly"
        ? { label: "Jadvalni saqlash", onClick: () => void saveSchedule(), saving: savingSchedule, disabled: false }
        : null;

  return (
    <>
      <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col">
        {/* Page header — full width, no inner sidebar */}
        <header className="border-b border-border bg-card/50 px-6 py-6 lg:px-10 lg:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Bron sozlamalari
              </p>
              <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight lg:text-4xl">
                Ish jadvali
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground lg:text-base">
                {isAdvance
                  ? "Oldindan rejim: mijozlar faqat belgilangan kunlarda va soatlarda bron qiladi."
                  : "Har kunlik rejim: salon ochilishidan yopilishigacha bo'sh slotlarga bron qilinadi."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium">
                {scope === "salon" ? "Salon" : "Mustaqil usta"}
              </span>
              <span className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
                {isAdvance
                  ? `Oldindan ${bookingSettings.advance_min_days}–${bookingSettings.advance_max_days} kun`
                  : "Har kunlik"}
              </span>
              <span className="rounded-lg border border-border px-3 py-1.5 text-xs tabular-nums text-muted-foreground">
                {workingDays}/7 ish kuni
              </span>
            </div>
          </div>

          {/* Segmented tabs */}
          <div className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-muted/40 p-1">
            {tabs.map((tab) => {
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
                    "inline-flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
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
        </header>

        {/* Content */}
        <div className="flex-1 px-6 py-8 lg:px-10 lg:py-10">
          {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
            <div className="mb-6 rounded-xl border border-primary/35 bg-primary/5 px-5 py-4 text-sm">
              Jadvalni to&apos;ldiring va saqlang.
            </div>
          ) : null}

          {scheduleBlocked ? (
            <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm">
              <p className="font-medium">Salon a&apos;zoligi kerak</p>
              <Link to={SIGNUP_FLOW_PATH.employee} className="mt-2 inline-flex items-center gap-1 underline">
                Salonga qo&apos;shilish <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : null}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {activeTab === "mode" && "Bron qabul qilish turini tanlang"}
              {activeTab === "weekly" &&
                (isAdvance
                  ? "Standart ish vaqti — oldindan kunlar uchun asos"
                  : "Ochilishdan yopilishgacha ish vaqti")}
              {activeTab === "advance" && "Har bir oldindan kun uchun soat va band slotlar"}
              {activeTab === "exceptions" && "Dam olish va maxsus kunlar"}
            </p>
            {activeSave ? (
              <Button
                type="button"
                size="lg"
                onClick={activeSave.onClick}
                disabled={scheduleBlocked || activeSave.saving || activeSave.disabled}
                className="h-11 gap-2 rounded-xl px-6"
              >
                {activeSave.saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {activeSave.label}
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="w-full">
              {activeTab === "mode" ? (
                <BookingModePanel
                  settings={bookingSettings}
                  onChange={setBookingSettings}
                  disabled={scheduleBlocked || savingMode}
                  layout="wide"
                />
              ) : null}

              {activeTab === "weekly" ? (
                <WorkingHoursEditor
                  days={days}
                  onChange={setDays}
                  disabled={scheduleBlocked || savingSchedule}
                />
              ) : null}

              {activeTab === "advance" && isAdvance ? (
                <AdvanceDayPlanner
                  scope={scope}
                  membershipId={membershipId}
                  weeklyDays={days}
                  advanceMinDays={bookingSettings.advance_min_days}
                  advanceMaxDays={bookingSettings.advance_max_days}
                  disabled={scheduleBlocked}
                />
              ) : null}

              {activeTab === "exceptions" && !isAdvance ? (
                <ScheduleExceptionsEditor
                  scope={scope}
                  membershipId={membershipId}
                  disabled={scheduleBlocked || savingSchedule}
                />
              ) : null}
            </div>
          )}

          <p className="mt-12 text-center text-sm text-muted-foreground">
            <Link to="/barber/calendar" className="font-medium text-foreground hover:underline">
              Kalendarda bronlarni ko&apos;rish
            </Link>
          </p>
        </div>
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
              Sahifadan chiqsangiz, o&apos;zgarishlar yo&apos;qolishi mumkin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button" onClick={() => blocker.reset?.()}>
              Qolish
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
