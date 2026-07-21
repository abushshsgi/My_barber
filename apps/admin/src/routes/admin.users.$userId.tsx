import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import { adjustAdminWallet, fetchAdminUserDetail, patchAdminUser } from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { uzRegionLabel } from "@/lib/uz-regions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/users/$userId")({
  component: UserDetailPage,
});

const SIGNUP_LABEL: Record<string, string> = {
  google: "Google",
  phone: "Telefon",
  email: "Email",
  unknown: "Noma'lum",
};

function UserDetailPage() {
  const { userId } = Route.useParams();
  const qc = useQueryClient();
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const userQ = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetchAdminUserDetail(userId),
  });

  const patchUser = useMutation({
    mutationFn: (body: Parameters<typeof patchAdminUser>[1]) => patchAdminUser(userId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "user", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("Mijoz yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const adjustM = useMutation({
    mutationFn: () =>
      adjustAdminWallet({
        user_id: Number(userId),
        amount: Number(adjustAmount),
        reason: adjustReason.trim(),
      }),
    onSuccess: (res) => {
      toast.success(`Balans tuzatildi · yangi: ${formatAdminUzs(res.balance_after)}`);
      setAdjustAmount("");
      setAdjustReason("");
      qc.invalidateQueries({ queryKey: ["admin", "user", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const u = userQ.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" asChild>
        <Link to="/admin/users">
          <ArrowLeft className="size-4" />
          Mijozlar
        </Link>
      </Button>

      {userQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : userQ.isError ? (
        <p className="text-sm text-destructive">{(userQ.error as Error).message}</p>
      ) : u ? (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-semibold">{u.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {u.displayEmail || "Email qo'shilmagan"}
                  {u.emailVerified ? (
                    <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      Tasdiqlangan
                    </span>
                  ) : u.displayEmail ? (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                      Tasdiqlanmagan
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">ID {u.id}</p>
              </div>
              <StatusBadge status={u.is_active ? "active" : "inactive"} />
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Info term="Ism / Familiya">
                {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
              </Info>
              <Info term="Telefon">
                <span className="tabular-nums">{u.phone || "—"}</span>
              </Info>
              <Info term="Viloyat (joylashuv)">{u.regionLabel || uzRegionLabel(u.region)}</Info>
              <Info term="Shahar / joy">
                {u.locationCity || u.defaultAddress || "—"}
              </Info>
              <Info term="GPS koordinatalar">
                {u.latitude && u.longitude ? (
                  <span className="tabular-nums">
                    {u.latitude}, {u.longitude}
                  </span>
                ) : (
                  "—"
                )}
              </Info>
              <Info term="Asosiy manzil">{u.defaultAddress || "—"}</Info>
              <Info term="Tug'ilgan yil">
                <span className="tabular-nums">{u.birthYear ?? "—"}</span>
              </Info>
              <Info term="Ro'yxat usuli">{SIGNUP_LABEL[u.signupMethod] ?? u.signupMethod}</Info>
              <Info term="Ro'yxatdan o'tgan">
                {format(new Date(u.created_at), "dd MMM yyyy HH:mm")}
              </Info>
              <Info term="Oila a'zolari">
                <span className="tabular-nums">{u.familyMembersCount}</span>
              </Info>
              <Info term="Jami bronlar">
                <span className="tabular-nums">{u.bookingsSummary.total}</span>
              </Info>
            </dl>

            <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <span className="text-sm font-medium">Faol hisob</span>
              <Switch
                checked={u.is_active}
                onCheckedChange={(checked) => patchUser.mutate({ is_active: checked })}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Section title="Bronlar" subtitle="Xizmatlar va summasi">
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                <Stat label="Jami" value={String(u.bookingsSummary.total)} />
                <Stat
                  label="Sarflangan"
                  value={formatAdminUzs(u.bookingsSummary.spentCompletedUzs)}
                />
              </div>
              {Object.keys(u.bookingsSummary.byStatus).length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {Object.entries(u.bookingsSummary.byStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs"
                    >
                      {status}: {count}
                    </span>
                  ))}
                </div>
              )}
              {u.recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Bronlar yo'q.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {u.recentBookings.map((b) => (
                    <li key={b.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{b.servicesPreview}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {b.salonName} · {b.barberName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Hudud: {b.regionLabel || "—"}
                            {b.customerPhone ? ` · Tel: ${b.customerPhone}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={bookingBadge(b.status)} />
                          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                            {b.startAt ? format(new Date(b.startAt), "dd MMM, HH:mm") : "—"}
                          </p>
                          <p className="text-xs font-medium tabular-nums">
                            {formatAdminUzs(b.totalPrice)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Bron hududlari" subtitle="Qayerda xizmat olgan">
              {u.bookingRegions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Hali bronlar bo'yicha hudud yo'q.</p>
              ) : (
                <ul className="space-y-3">
                  {u.bookingRegions.map((r) => (
                    <li key={r.region} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.label}</span>
                      <span className="tabular-nums text-muted-foreground">{r.bookings} bron</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Morph AI" subtitle="Stil / try-on / studio — token va xarajat">
              <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Stat label="Generatsiya" value={String(u.morphAi.generations)} />
                <Stat label="Try-on" value={String(u.morphAi.tryon)} />
                <Stat label="Studio" value={String(u.morphAi.studio)} />
                <Stat label="Tahlil" value={String(u.morphAi.analyze)} />
                <Stat label="Jami token" value={u.morphAi.totalTokens.toLocaleString()} />
                <Stat label="Xarajat" value={`$${u.morphAi.costUsd.toFixed(4)}`} />
              </div>
              <p className="mb-1 text-xs text-muted-foreground">
                Prompt {u.morphAi.promptTokens.toLocaleString()} · Candidates{" "}
                {u.morphAi.candidatesTokens.toLocaleString()} · OK {u.morphAi.success} / Xato{" "}
                {u.morphAi.failed}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                Oxirgi foydalanish:{" "}
                {u.morphAi.lastAt
                  ? format(new Date(u.morphAi.lastAt), "dd MMM yyyy HH:mm")
                  : "—"}
              </p>
              {u.recentStyles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Uslublar tarixi yo'q.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {u.recentStyles.slice(0, 12).map((s, i) => (
                    <li key={`${s.styleId}-${s.createdAt}-${i}`} className="py-2.5 first:pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{s.styleTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.kind}
                            {s.source ? ` · ${s.source}` : ""}
                            {s.createdAt
                              ? ` · ${format(new Date(s.createdAt), "dd MMM yyyy HH:mm")}`
                              : ""}
                          </p>
                          {s.model || s.provider ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {[s.provider, s.model].filter(Boolean).join(" · ")}
                              {s.latencyMs ? ` · ${s.latencyMs}ms` : ""}
                            </p>
                          ) : null}
                          {s.errorDetail ? (
                            <p className="mt-0.5 text-[11px] text-destructive">{s.errorDetail}</p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right text-xs tabular-nums">
                          <p className="font-medium">{s.totalTokens.toLocaleString()} tok</p>
                          <p className="text-muted-foreground">
                            {s.promptTokens}/{s.candidatesTokens}
                          </p>
                          <p className="text-muted-foreground">${s.costUsd.toFixed(4)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Hamyon" subtitle="Balans va oxirgi operatsiyalar">
              {!u.wallet ? (
                <p className="text-sm text-muted-foreground">Hamyon ochilmagan.</p>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Raqam" value={u.wallet.walletNumber} />
                    <Stat label="Balans" value={formatAdminUzs(u.wallet.balance)} />
                  </div>
                  {u.wallet.recentEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Operatsiyalar yo'q.</p>
                  ) : (
                    <ul className="divide-y divide-border text-sm">
                      {u.wallet.recentEntries.map((e) => (
                        <li key={e.id} className="flex justify-between gap-3 py-2 first:pt-0">
                          <span>
                            {e.entryType}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {e.createdAt
                                ? format(new Date(e.createdAt), "dd MMM yyyy")
                                : ""}
                            </span>
                          </span>
                          <span className="tabular-nums font-medium">
                            {formatAdminUzs(e.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-5 space-y-2 border-t border-border pt-4">
                    <p className="text-sm font-medium">Manual tuzatish</p>
                    <p className="text-xs text-muted-foreground">
                      Musbat = qo&apos;shish, manfiy = ayirish. Sabab majburiy, auditga yoziladi.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="adj-amount">Summa (so&apos;m)</Label>
                        <Input
                          id="adj-amount"
                          value={adjustAmount}
                          onChange={(e) => setAdjustAmount(e.target.value)}
                          placeholder="50000 yoki -20000"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor="adj-reason">Sabab</Label>
                        <Textarea
                          id="adj-reason"
                          value={adjustReason}
                          onChange={(e) => setAdjustReason(e.target.value)}
                          placeholder="Shikoyat / kompensatsiya / xato tuzatish..."
                          rows={2}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={
                        adjustM.isPending ||
                        !adjustAmount ||
                        Number.isNaN(Number(adjustAmount)) ||
                        Number(adjustAmount) === 0 ||
                        adjustReason.trim().length < 5
                      }
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Balans ${Number(adjustAmount) > 0 ? "+" : ""}${adjustAmount} so'm ga o'zgartirilsinmi?`,
                          )
                        ) {
                          return;
                        }
                        adjustM.mutate();
                      }}
                    >
                      Tuzatishni saqlash
                    </Button>
                  </div>
                </>
              )}
            </Section>

            <Section title="Oila a'zolari" subtitle="Tez bron uchun saqlanganlar">
              {u.familyMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Oila a'zolari yo'q.</p>
              ) : (
                <ul className="divide-y divide-border text-sm">
                  {u.familyMembers.map((m) => (
                    <li key={m.id} className="py-2 first:pt-0">
                      <p className="font-medium">{m.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.relationLabel}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-4 text-sm text-muted-foreground">
            Obuna turlari va referal chaqirishlar hozircha backendda saqlanmaydi — qo'shilganda
            shu yerda ko'rinadi.
          </div>
        </>
      ) : null}
    </div>
  );
}

function Info({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{term}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-heading text-lg font-medium text-foreground">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function bookingBadge(
  s: string,
): "pending" | "confirmed" | "in_chair" | "completed" | "cancelled" {
  if (s === "accepted") return "confirmed";
  if (s === "in_progress") return "in_chair";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  return "pending";
}
