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
import { UnsavedChangesDialog } from "@/components/barber/UnsavedChangesDialog";
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
    const base: { id: TabId; label: string; shortLabel: string; icon: typeof Sparkles }[] = [
      { id: "mode", label: "Bron rejimi", shortLabel: "Rejim", icon: Sparkles },
      {
        id: "weekly",
        label: isAdvance ? "Haftalik shablon" : "Haftalik jadval",
        shortLabel: "Jadval",
        icon: CalendarClock,
      },
    ];
    if (isAdvance) {
      base.push({ id: "advance", label: "Oldindan kunlar", shortLabel: "Kunlar", icon: CalendarRange });
    } else {
      base.push({ id: "exceptions", label: "Maxsus kunlar", shortLabel: "Maxsus", icon: CalendarDays });
    }
    return base;
  }, [isAdvance]);

  const activeSave =
    activeTab === "mode"
      ? {
          label: "Saqlash",
          onClick: () => void saveBookingMode(),
          saving: savingMode,
          disabled: !hasUnsavedMode,
        }
      : activeTab === "weekly"
        ? {
            label: "Saqlash",
            onClick: () => void saveSchedule(),
            saving: savingSchedule,
            disabled: false,
          }
        : null;

  const switchTab = (tabId: TabId) => {
    const leavingDirty =
      (activeTab === "mode" && hasUnsavedMode) || (activeTab === "weekly" && hasUnsavedSchedule);
    if (leavingDirty) {
      const ok = window.confirm("Saqlanmagan o'zgarishlar bor. Davom etasizmi?");
      if (!ok) return;
    }
    setActiveTab(tabId);
  };

  return (
    <>
      <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col pb-20 md:pb-0">
        <header className="sticky top-14 z-[5] border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                Ish jadvali
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
                {isAdvance
                  ? "Oldindan bron — belgilangan kun va soatlarda"
                  : "Har kunlik — ochilishdan yopilishgacha"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-border px-2 py-0.5 text-[10px] font-medium sm:text-xs">
                {scope === "salon" ? "Salon" : "Mustaqil"}
              </span>
              <span className="rounded-md bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background sm:text-xs">
                {isAdvance
                  ? `${bookingSettings.advance_min_days}–${bookingSettings.advance_max_days} kun`
                  : "Har kunlik"}
              </span>
              <span className="rounded-md border border-border px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground sm:text-xs">
                {workingDays}/7
              </span>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8">
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
                  onClick={() => switchTab(tab.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm",
                    active
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5 sm:size-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {dirty ? <span className="size-1.5 rounded-full bg-destructive" /> : null}
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
            <div className="mb-4 rounded-lg border border-primary/35 bg-primary/5 px-4 py-3 text-sm">
              Jadvalni to&apos;ldiring va saqlang.
            </div>
          ) : null}

          {scheduleBlocked ? (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium">Salon a&apos;zoligi kerak</p>
              <Link to={SIGNUP_FLOW_PATH.employee} className="mt-1 inline-flex items-center gap-1 underline">
                Salonga qo&apos;shilish <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : null}

          {loading ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mx-auto w-full max-w-5xl">
              {activeTab === "mode" ? (
                <BookingModePanel
                  settings={bookingSettings}
                  onChange={setBookingSettings}
                  disabled={scheduleBlocked || savingMode}
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

          <p className="mx-auto mt-8 max-w-5xl text-center text-xs text-muted-foreground sm:text-sm">
            <Link to="/barber/calendar" className="font-medium text-foreground hover:underline">
              Kalendarda bronlarni ko&apos;rish
            </Link>
          </p>
        </div>

        {activeSave ? (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-3 backdrop-blur-sm md:static md:mt-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <div className="mx-auto flex max-w-5xl justify-end px-1 md:px-0">
              <Button
                type="button"
                onClick={activeSave.onClick}
                disabled={scheduleBlocked || activeSave.saving || activeSave.disabled}
                className="h-10 w-full gap-2 rounded-lg sm:w-auto sm:px-6"
              >
                {activeSave.saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {activeSave.label}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
