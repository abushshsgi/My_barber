import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  fetchAdminDepositStats,
  type AdminDepositBucket,
  type AdminDepositPerson,
  type AdminDepositStats,
} from "@/lib/admin-api";
import { formatAdminUzs, formatAdminUzsFull } from "@/lib/admin-analytics";

export const Route = createFileRoute("/admin/finance/deposits-stats")({
  component: AdminDepositStatsPage,
});

const STATUS_ROWS: Array<{ key: keyof AdminDepositStats; label: string }> = [
  { key: "approved", label: "Tasdiqlangan" },
  { key: "claimed", label: "Tekshiruvda" },
  { key: "awaiting", label: "To'lov kutilmoqda" },
  { key: "rejected", label: "Rad etilgan" },
  { key: "expired", label: "Muddati o'tgan" },
  { key: "cancelled", label: "Bekor" },
];

function personLabel(name: string, phone: string) {
  return name.trim() || phone.trim() || "Noma'lum";
}

function dayLabel(iso: string) {
  if (!iso) return "—";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso.slice(5);
  return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
}

function whenLabel(iso: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function channelLabel(channel: string) {
  if (channel === "mobile") return "Mobil ilova";
  if (channel === "web") return "Web";
  return "Noma'lum";
}

function changeLabel(current: number, previous: number) {
  if (!previous) return current > 0 ? "oldingisidan ko'p" : "oldingi davrda ham yo'q";
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return "oldingi davr bilan teng";
  return pct > 0 ? `oldingidan +${pct}%` : `oldingidan ${pct}%`;
}

function reviewLabel(minutes: number | null) {
  if (minutes == null) return "—";
  if (minutes < 1) return "1 daqiqadan kam";
  if (minutes < 60) return `${minutes} daqiqa`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} soat ${rest} daq` : `${hours} soat`;
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function PeopleList({
  title,
  hint,
  people,
  empty,
}: {
  title: string;
  hint: string;
  people: AdminDepositPerson[];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <div className="mt-4 divide-y divide-border/70">
        {people.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">{empty}</p>
        ) : (
          people.map((person, index) => (
            <div key={person.id} className="flex items-center gap-3 py-2.5">
              <span className="w-5 text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {personLabel(person.full_name, person.phone)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {person.phone || `ID ${person.id}`} · {person.count} marta
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatAdminUzsFull(person.amount)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminDepositStatsPage() {
  const statsQ = useQuery({
    queryKey: ["admin", "wallet-deposit-stats"],
    queryFn: fetchAdminDepositStats,
    refetchInterval: 30_000,
  });
  const stats = statsQ.data;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          To'ldirish statistikasi
        </h1>
        <Link
          to="/admin/finance/deposits"
          className="mt-2 inline-flex text-sm font-semibold text-foreground underline-offset-2 hover:underline"
        >
          Karta to'ldirishlar
        </Link>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Tasdiqlangan pullar, kunlik va oylik hajm, kim qancha to'ldirgani, rad etilganlar va qaysi
          ilovadan kelgani.
        </p>
      </div>

      {statsQ.isError ? (
        <EmptyState
          title="Statistika yuklanmadi"
          description={
            statsQ.error instanceof Error ? statsQ.error.message : "Qayta urinib ko'ring."
          }
        />
      ) : !stats ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <StatsBody stats={stats} />
      )}
    </div>
  );
}

function StatsBody({ stats }: { stats: AdminDepositStats }) {
  const maxDay = Math.max(1, ...stats.days.map((day) => day.amount));
  const peak = stats.days.reduce<(typeof stats.days)[number] | null>(
    (best, day) => (!best || day.amount > best.amount ? day : best),
    null,
  );
  const busyHours = stats.hours.filter((hour) => hour.count > 0);
  const maxHour = Math.max(1, ...stats.hours.map((hour) => hour.count));
  const leader = stats.top_user;
  const largest = stats.largest;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Bugun"
          value={formatAdminUzsFull(stats.today.approved_amount)}
          hint={`${stats.today.approved_count} ta tasdiq · ${stats.today.approved_people} kishi · ${stats.today.requests} ta so'rov`}
        />
        <StatTile
          label="Shu hafta"
          value={formatAdminUzsFull(stats.week.amount)}
          hint={`${stats.week.count} ta · ${stats.week.people} kishi · ${changeLabel(stats.week.amount, stats.previous_week.amount)}`}
        />
        <StatTile
          label="Shu oy"
          value={formatAdminUzsFull(stats.month.amount)}
          hint={`${stats.month.count} ta · ${stats.month.people} kishi · ${changeLabel(stats.month.amount, stats.previous_month.amount)}`}
        />
        <StatTile
          label="Jami tasdiqlangan"
          value={formatAdminUzsFull(stats.approved.amount)}
          hint={`${stats.approved.count} ta · ${stats.approved.people} kishi · o'rtacha ${formatAdminUzsFull(stats.average_approved)}`}
        />
        <StatTile
          label="Tasdiq ulushi"
          value={`${stats.approval_rate}%`}
          hint={`Rad ${stats.rejected.count} ta · ${formatAdminUzsFull(stats.rejected.amount)} · bugun rad ${stats.today.rejected_count}`}
        />
        <StatTile
          label="Hozir kutilmoqda"
          value={String(stats.pending.count)}
          hint={`${formatAdminUzsFull(stats.pending.amount)} · tekshiruv ${stats.claimed.count} · to'lov kutilyapti ${stats.awaiting.count}`}
        />
        <StatTile
          label="Mijozlar"
          value={String(stats.approved.people)}
          hint={`${stats.repeat_people} kishi qayta to'ldirgan · ${stats.once_people} kishi bir marta`}
        />
        <StatTile
          label="O'rtacha tekshiruv"
          value={reviewLabel(stats.average_review_minutes)}
          hint={
            largest
              ? `Eng katta bitta to'lov ${formatAdminUzsFull(largest.amount)} · ${personLabel(largest.full_name, largest.phone)}`
              : "Hali tasdiqlangan to'lov yo'q"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Oxirgi 30 kun
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Tasdiqlangan summa.
                {peak && peak.amount > 0
                  ? ` Eng yuqori kun ${dayLabel(peak.date)} · ${formatAdminUzsFull(peak.amount)}.`
                  : ""}
              </p>
            </div>
          </div>
          <div className="mt-4 flex h-32 items-end gap-1">
            {stats.days.map((day) => (
              <div
                key={day.date}
                title={`${dayLabel(day.date)} · ${day.count} ta · ${formatAdminUzsFull(day.amount)}`}
                className="min-w-0 flex-1 rounded-sm bg-foreground/80"
                style={{
                  height: `${Math.max(day.amount > 0 ? 8 : 2, (day.amount / maxDay) * 100)}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>{dayLabel(stats.days[0]?.date || "")}</span>
            <span>{dayLabel(stats.days[stats.days.length - 1]?.date || "")}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Holatlar
          </p>
          <div className="mt-3 divide-y divide-border/70">
            {STATUS_ROWS.map((row) => {
              const bucket = stats[row.key] as AdminDepositBucket;
              return (
                <div key={row.key} className="flex items-center justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{bucket.people} kishi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{bucket.count} ta</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatAdminUzsFull(bucket.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Qayerdan kelgan
          </p>
          <div className="mt-3 space-y-3">
            {stats.channels.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Kanal ma'lumoti yo'q.</p>
            ) : (
              stats.channels.map((channel) => (
                <div key={channel.channel || "unknown"}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold">{channelLabel(channel.channel)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {channel.count} · {formatAdminUzs(channel.amount)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{
                        width: `${Math.max(channel.amount > 0 ? 6 : 0, (channel.amount / Math.max(1, stats.approved.amount)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Bugungi soatlar
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tasdiqlangan to'lovlar soat bo'yicha.
          </p>
          <div className="mt-4 flex h-24 items-end gap-0.5">
            {stats.hours.map((hour) => (
              <div
                key={hour.hour}
                title={`${String(hour.hour).padStart(2, "0")}:00 · ${hour.count} ta`}
                className="min-w-0 flex-1 rounded-sm bg-foreground/70"
                style={{
                  height: `${Math.max(hour.count > 0 ? 10 : 2, (hour.count / maxHour) * 100)}%`,
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {busyHours.length === 0
              ? "Bugun hali tasdiq yo'q."
              : busyHours
                  .map((hour) => `${String(hour.hour).padStart(2, "0")}:00 · ${hour.count}`)
                  .join(" · ")}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Eng ko'p to'ldirgan
          </p>
          <p className="mt-1 font-heading text-xl font-semibold tracking-tight">
            {leader ? personLabel(leader.full_name, leader.phone) : "Hali yo'q"}
          </p>
          {leader ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatAdminUzsFull(leader.amount)} · {leader.count} marta ·{" "}
              {leader.phone || `ID ${leader.id}`}
            </p>
          ) : null}
          <p className="mt-4 text-xs text-muted-foreground">
            Bugun rad summasi {formatAdminUzsFull(stats.today.rejected_amount)}. Muddati o'tgan{" "}
            {stats.expired.count} ta, bekor {stats.cancelled.count} ta.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PeopleList
          title="Summa bo'yicha"
          hint="Tasdiqlangan jami summa eng katta odamlar."
          people={stats.top_users}
          empty="Tasdiqlangan odamlar yo'q."
        />
        <PeopleList
          title="Necha marta"
          hint="Eng ko'p marta to'ldirgan odamlar."
          people={stats.frequent_users}
          empty="Takroriy to'ldirish yo'q."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Rad sabablari
          </p>
          <div className="mt-3 divide-y divide-border/70">
            {stats.reject_notes.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Rad etilgan izoh yo'q.</p>
            ) : (
              stats.reject_notes.map((note) => (
                <div key={note.note} className="flex items-start justify-between gap-3 py-2.5">
                  <p className="min-w-0 text-sm">{note.note}</p>
                  <p className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {note.count} ta
                    <br />
                    {formatAdminUzs(note.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            So'nggi tasdiqlar
          </p>
          <div className="mt-3 divide-y divide-border/70">
            {stats.recent.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Hali tasdiq yo'q.</p>
            ) : (
              stats.recent.map((row, index) => (
                <div
                  key={`${row.at}-${index}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {personLabel(row.full_name, row.phone)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {whenLabel(row.at)} · {channelLabel(row.channel)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatAdminUzsFull(row.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
