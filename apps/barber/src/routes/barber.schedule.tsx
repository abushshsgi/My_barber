import { createFileRoute, Link, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Coffee,
  Loader2,
  Save,
  Sparkles,
  Sun,
} from "lucide-react";
import { toast } from "sonner";
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

type TabId = "mode" | "weekly" | "exceptions";

const TABS: {
  id: TabId;
  label: string;
  description: string;
  icon: typeof CalendarClock;
}[] = [
  {
    id: "mode",
    label: "Bron rejimi",
    description: "Har kunlik yoki oldindan",
    icon: Sparkles,
  },
  {
    id: "weekly",
    label: "Haftalik jadval",
    description: "Ish vaqti va tushlik",
    icon: CalendarClock,
  },
  {
    id: "exceptions",
    label: "Maxsus kunlar",
    description: "Dam va istisnolar",
    icon: CalendarDays,
  },
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
  const offDays = 7 - workingDays;
  const isAdvance = bookingSettings.booking_mode === "advance";

  const tabDirty = (id: TabId) =>
    (id === "mode" && hasUnsavedMode) || (id === "weekly" && hasUnsavedSchedule);

  const activeSave =
    activeTab === "mode"
      ? { label: "Rejimni saqlash", onClick: () => void saveBookingMode(), saving: savingMode, disabled: !hasUnsavedMode }
      : activeTab === "weekly"
        ? { label: "Jadvalni saqlash", onClick: () => void saveSchedule(), saving: savingSchedule, disabled: false }
        : null;

  return (
    <>
      <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="shrink-0 border-b border-border bg-muted/20 lg:w-[min(100%,320px)] lg:border-b-0 lg:border-r">
          <div className="p-5 lg:p-6 lg:pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Jadval sozlamalari
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
              Ish jadvali
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Mijozlar faqat shu yerda belgilangan vaqtlarda bron qila oladi.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium">
                {scope === "salon" ? "Salon" : "Mustaqil"}
              </span>
              {!loading ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/20 bg-foreground px-2.5 py-1 text-xs font-semibold text-background">
                  {isAdvance ? (
                    <>
                      <CalendarRange className="size-3.5" />
                      {bookingSettings.advance_min_days}–{bookingSettings.advance_max_days} kun
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

          {/* Quick stats — vertical stack in sidebar */}
          {!loading ? (
            <div className="hidden space-y-2 px-5 pb-4 lg:block lg:px-6">
              <SidebarStat icon={Sun} label="Ish kunlari" value={`${workingDays} / 7`} />
              <SidebarStat
                icon={isAdvance ? CalendarRange : CalendarClock}
                label="Bron rejimi"
                value={isAdvance ? "Oldindan" : "Har kunlik"}
              />
              <SidebarStat icon={Coffee} label="Dam kunlari" value={String(offDays)} />
            </div>
          ) : null}

          {/* Nav */}
          <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:gap-1 lg:px-3 lg:pb-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const dirty = tabDirty(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex min-w-[9.5rem] shrink-0 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all lg:min-w-0 lg:w-full lg:px-4 lg:py-3.5",
                    active
                      ? "border-foreground bg-foreground text-background shadow-md"
                      : "border-transparent bg-background/60 hover:border-border hover:bg-background",
                  )}
                >
                  <div
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg",
                      active ? "bg-background/15" : "bg-muted",
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{tab.label}</span>
                      {dirty ? (
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            active ? "bg-background" : "bg-foreground",
                          )}
                        />
                      ) : null}
                    </div>
                    <p
                      className={cn(
                        "truncate text-xs",
                        active ? "text-background/70" : "text-muted-foreground",
                      )}
                    >
                      {tab.description}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "size-4 shrink-0 lg:hidden",
                      active ? "text-background/60" : "text-muted-foreground",
                    )}
                  />
                </button>
              );
            })}
          </nav>

          <div className="hidden border-t border-border px-6 py-4 lg:block">
            <Link
              to="/barber/calendar"
              className="flex items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              Kalendarda bronlar
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          {/* Sticky action bar */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-sm lg:px-8 lg:py-5">
            <div>
              <h2 className="font-heading text-xl font-semibold lg:text-2xl">
                {TABS.find((t) => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeTab === "mode" && "Qanday va qachon bron qabul qilasiz?"}
                {activeTab === "weekly" && "Har kunning ish vaqti va tanaffuslari"}
                {activeTab === "exceptions" && "Muayyan sanalar uchun istisnolar"}
              </p>
            </div>
            {activeSave ? (
              <Button
                type="button"
                size="lg"
                onClick={activeSave.onClick}
                disabled={scheduleBlocked || activeSave.saving || activeSave.disabled}
                className="h-11 shrink-0 gap-2 rounded-xl px-6 text-base"
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

          <div className="flex-1 px-5 py-6 lg:px-8 lg:py-8">
            {!fullyReady && activationSteps.services_ok && !activationSteps.schedule_ok ? (
              <div className="mb-6 rounded-xl border border-primary/35 bg-primary/5 px-5 py-4 text-sm">
                <span className="font-medium">Profil tayyorligi:</span> jadvalni to&apos;ldiring va
                saqlang.
              </div>
            ) : null}

            {scheduleBlocked ? (
              <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-sm">
                <p className="font-medium">Salon a&apos;zoligi kerak</p>
                <p className="mt-1 text-muted-foreground">
                  Taklifni qabul qiling yoki salonga qo&apos;shiling.
                </p>
                <Link
                  to={SIGNUP_FLOW_PATH.employee}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
                >
                  Salonga qo&apos;shilish
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[960px] lg:max-w-none">
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

                {activeTab === "exceptions" ? (
                  <ScheduleExceptionsEditor
                    scope={scope}
                    membershipId={membershipId}
                    disabled={scheduleBlocked || savingSchedule}
                  />
                ) : null}
              </div>
            )}
          </div>
        </main>
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

function SidebarStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/80 px-3 py-2.5">
      <div className="grid size-8 place-items-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="font-heading text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}
