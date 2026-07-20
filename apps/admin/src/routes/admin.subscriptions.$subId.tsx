import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminActivateSubscription,
  adminDeactivateSubscription,
  fetchAdminSubscriptionDetail,
} from "@/lib/admin-api";
import { useState } from "react";

export const Route = createFileRoute("/admin/subscriptions/$subId")({
  component: AdminSubscriptionDetailPage,
});

function AdminSubscriptionDetailPage() {
  const { subId } = Route.useParams();
  const qc = useQueryClient();
  const [reason, setReason] = useState("");
  const [extendDays, setExtendDays] = useState("7");

  const q = useQuery({
    queryKey: ["admin", "subscriptions", "detail", subId],
    queryFn: () => fetchAdminSubscriptionDetail(subId),
  });

  const deactivateM = useMutation({
    mutationFn: () => adminDeactivateSubscription(subId, reason),
    onSuccess: () => {
      toast.success("Obuna o'chirildi");
      void qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activateM = useMutation({
    mutationFn: () => adminActivateSubscription(subId, Number(extendDays) || undefined),
    onSuccess: () => {
      toast.success("Obuna faollashtirildi");
      void qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <div className="p-6">
        <CardSkeleton />
      </div>
    );
  }

  const d = q.data;
  if (!d) {
    return <div className="p-6 text-sm text-muted-foreground">Topilmadi</div>;
  }

  const sub = d.subscription;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <Link to="/admin/subscriptions" className="text-sm text-muted-foreground hover:underline">
          ← Obunalar
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold capitalize">
          {sub.plan_code} · {sub.user.full_name || sub.user.phone}
        </h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{sub.status}</Badge>
          <Badge variant="secondary">{sub.source}</Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="text-xs font-bold uppercase text-muted-foreground">Mijoz</p>
          <p className="mt-1 font-medium">{sub.user.full_name || "—"}</p>
          <p className="text-muted-foreground">{sub.user.phone}</p>
          <p className="text-muted-foreground">{sub.user.email}</p>
          <p className="mt-2 text-xs">ID: {sub.user.id}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="text-xs font-bold uppercase text-muted-foreground">Davr</p>
          <p className="mt-1">Boshlanish: {sub.starts_at ? new Date(sub.starts_at).toLocaleString("uz-UZ") : "—"}</p>
          <p>Tugash: {sub.ends_at ? new Date(sub.ends_at).toLocaleString("uz-UZ") : "—"}</p>
          <p className="mt-2">Narx: {sub.price_uzs.toLocaleString("uz-UZ")} so'm</p>
          {sub.payment_order_id ? (
            <p className="mt-1 break-all text-xs text-muted-foreground">Order: {sub.payment_order_id}</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-bold uppercase text-muted-foreground">Limitlar (joriy oy)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            Morph AI: {d.usage.morph_ai_used} / {d.usage.morph_ai_limit} (qoldi{" "}
            {d.usage.morph_ai_remaining})
          </div>
          <div>
            Studio: {d.usage.morph_studio_used} / {d.usage.morph_studio_limit} (qoldi{" "}
            {d.usage.morph_studio_remaining})
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-bold uppercase text-muted-foreground">Active / Deactive</p>
        {sub.status === "active" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Sabab"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button
              variant="destructive"
              disabled={deactivateM.isPending}
              onClick={() => deactivateM.mutate()}
            >
              Deactivate
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="w-28"
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              placeholder="Kun"
            />
            <Button disabled={activateM.isPending} onClick={() => activateM.mutate()}>
              Activate
            </Button>
          </div>
        )}
        {sub.deactivated_reason ? (
          <p className="text-xs text-muted-foreground">
            Oxirgi o'chirish: {sub.deactivated_reason} ({sub.deactivated_by})
          </p>
        ) : null}
      </div>

      {d.referral_trial.granted ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          Referal sinov berilgan
          {d.referral_trial.ends_at
            ? ` · ${new Date(d.referral_trial.ends_at).toLocaleDateString("uz-UZ")}`
            : ""}
          {d.referral_trial.referral_count_at_grant != null
            ? ` · ${d.referral_trial.referral_count_at_grant} ta referal`
            : ""}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading font-semibold">Audit log</h2>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
          {d.events.map((ev) => (
            <li key={ev.id} className="rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{ev.action}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(ev.created_at).toLocaleString("uz-UZ")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{ev.actor}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading font-semibold">To'lovlar</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {d.payments.length === 0 ? (
            <li className="text-muted-foreground">Yo'q</li>
          ) : (
            d.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2">
                <span>
                  {p.provider} · {p.plan_code} · {p.amount_uzs.toLocaleString("uz-UZ")} so'm
                </span>
                <Badge variant="secondary">{p.status}</Badge>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
