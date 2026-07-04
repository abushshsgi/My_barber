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
  WEEKDAYS,
  WEEKDAY_SHORT,
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
      <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col lg:flex-row">
        {/* Chap panel — hafta + bo'limlar */}
        <aside className="shrink-0 border-b border-border bg-muted/30 lg:w-[300px] lg:border-b-0 lg:border-r">
          <div className="p-4 sm:p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Ish vaqti
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">Ish jadvali</h1>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {isAdvance
                ? "Oldindan bron — faqat ochiq kun va soatlarda"
                : "Har kuni ochiq vaqt oralig'ida bron qabul qilinadi"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-semibold">
                {scope === "salon" ? "Salon" : "Mustaqil"}
              </span>
              <span className="rounded-full bg-foreground px-2.5 py-0.5 text-[10px] font-semibold text-background">
                {workingDays}/7 kun ochiq
              </span>
            </div>
          </div>

          {/* Hafta ko'rinishi */}
          <div className="grid grid-cols-7 gap-1 px-4 pb-4 lg:px-5">
            {days.map((day) => {
              const label = WEEKDAY_SHORT[day.weekday] ?? "?";
              const open = !day.is_day_off;
              return (
                <div
                  key={day.weekday}
                  className={cn(
                    "flex flex-col items-center rounded-xl border py-2 text-center transition-colors",
                    open
                      ? "border-foreground/20 bg-background shadow-sm"
                      : "border-dashed border-border/80 bg-muted/40 opacity-60",
                  )}
                  title={open ? `${day.open_time} – ${day.close_time}` : "Dam olish"}
                >
                  <span className="text-[9px] font-bold uppercase text-muted-foreground">{label}</span>
                  <span
                    className={cn(
                      "mt-0.5 size-2 rounded-full",
                      open ? "bg-emerald-500" : "bg-muted-foreground/30",
                    )}
                  />
                </div>
              );
            })}
          </div>

          <nav className="flex gap-1 overflow-x-auto px-4 pb-4 lg:flex-col lg:gap-1.5 lg:px-5 lg:pb-6">
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
                    "inline-flex min-w-[7.5rem] shrink-0 items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-all lg:min-w-0 lg:w-full",
                    active
                      ? "border-foreground bg-foreground text-background shadow-md"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                  {dirty ? <span className="size-2 shrink-0 rounded-full bg-destructive" /> : null}
                </button>
              );
            })}
          </nav>

          <div className="hidden border-t border-border p-4 lg:block lg:p-5">
            <Link
              to="/barber/calendar"
              className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
            >
              Kalendarda bronlar
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </aside>

        {/* O'ng — kontent */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
            {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
              <div className="mb-5 rounded-2xl border border-primary/35 bg-primary/5 px-4 py-3 text-sm">
                Jadvalni to&apos;ldiring va saqlang — mijozlar bron qila oladi.
              </div>
            ) : null}

            {scheduleBlocked ? (
              <div className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                <p className="font-medium">Salon a&apos;zoligi kerak</p>
                <Link to={SIGNUP_FLOW_PATH.employee} className="mt-1 inline-flex items-center gap-1 underline">
                  Salonga qo&apos;shilish <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Jadval yuklanmoqda…</p>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl">
                <div className="rounded-2xl border border-border bg-card p-1 shadow-card">
                  <div className="rounded-[14px] bg-background p-4 sm:p-6">
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
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground lg:hidden">
                  <Link to="/barber/calendar" className="font-medium text-foreground hover:underline">
                    Kalendarda bronlarni ko&apos;rish
                  </Link>
                </p>
              </div>
            )}
          </div>

          {activeSave ? (
            <div className="sticky bottom-0 border-t border-border bg-background/95 p-4 backdrop-blur-md">
              <div className="mx-auto flex max-w-3xl justify-end">
                <Button
                  type="button"
                  onClick={activeSave.onClick}
                  disabled={scheduleBlocked || activeSave.saving || activeSave.disabled}
                  className="h-11 w-full gap-2 rounded-xl sm:w-auto sm:px-8"
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
      </div>

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
