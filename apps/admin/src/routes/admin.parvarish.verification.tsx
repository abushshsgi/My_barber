import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveAdminProductCandidate,
  fetchAdminProductCandidateDetail,
  fetchAdminProductCandidates,
  fetchAdminProductVerificationDashboard,
  fetchAdminAggregationJobs,
  linkAdminProductCandidateExisting,
  mergeAdminProductCandidates,
  rejectAdminProductCandidate,
  requestInfoAdminProductCandidate,
  splitAdminProductCandidate,
} from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { useEffect, useState } from "react";
import { Package, ScanLine, ShieldAlert, Sparkles } from "lucide-react";

export const Route = createFileRoute("/admin/parvarish/verification")({
  component: ProductVerificationPage,
});

function ProductVerificationPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");
  const [linkCareId, setLinkCareId] = useState("");
  const [inciDraft, setInciDraft] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const dashboard = useQuery({
    queryKey: ["admin", "product-verification", "dashboard"],
    queryFn: fetchAdminProductVerificationDashboard,
  });
  const list = useQuery({
    queryKey: ["admin", "product-verification", "candidates"],
    queryFn: () => fetchAdminProductCandidates({ status: "" }),
  });
  const detail = useQuery({
    queryKey: ["admin", "product-verification", "candidate", selectedId],
    queryFn: () => fetchAdminProductCandidateDetail(selectedId!),
    enabled: Boolean(selectedId),
  });
  const aggJobs = useQuery({
    queryKey: ["admin", "product-verification", "aggregation-jobs"],
    queryFn: () => fetchAdminAggregationJobs({ status: "failed" }),
  });

  const approve = useMutation({
    mutationFn: ({ id, ingredients, notes }: { id: string; ingredients: string[]; notes: string }) =>
      approveAdminProductCandidate(id, {
        corrected_fields: ingredients.length ? { ingredients } : {},
        review_notes: notes,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "product-verification"] }),
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectAdminProductCandidate(id, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "product-verification"] }),
  });
  const merge = useMutation({
    mutationFn: ({ source, target }: { source: string; target: string }) =>
      mergeAdminProductCandidates(source, target),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "product-verification"] }),
  });
  const split = useMutation({
    mutationFn: ({ id, submissionIds }: { id: string; submissionIds: string[] }) =>
      splitAdminProductCandidate(id, submissionIds),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "product-verification"] }),
  });
  const linkExisting = useMutation({
    mutationFn: ({ id, careId }: { id: string; careId: number }) =>
      linkAdminProductCandidateExisting(id, { care_product_id: careId }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "product-verification"] }),
  });
  const requestInfo = useMutation({
    mutationFn: (id: string) => requestInfoAdminProductCandidate(id, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "product-verification"] }),
  });

  const subs = detail.data?.submissions ?? [];
  const conflicts = detail.data?.conflicts ?? [];
  const reviews = detail.data?.reviews ?? [];

  useEffect(() => {
    if (!selectedId || !subs.length) {
      setInciDraft("");
      return;
    }
    const first = subs[0];
    const list = (first?.ingredients as string[] | undefined) ?? [];
    setInciDraft(list.join(", "));
  }, [selectedId, subs]);

  if (dashboard.isLoading || list.isLoading) return <CardSkeleton className="h-56" />;
  const d = dashboard.data;

  return (
    <div className="space-y-6">
      <motionHeader />
      {d ? (
        <buttonRow
          pending={d.pending_candidates}
          conflicts={d.conflicts_open}
          verified={d.verified_candidates}
          submissions={d.submissions_total}
        />
      ) : null}

      {aggJobs.data?.jobs?.length ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold">
            Agregatsiya navbatı (failed: {aggJobs.data.jobs.length}, pending: {aggJobs.data.pending})
          </p>
          <ul className="mt-2 max-h-24 overflow-y-auto text-xs text-muted-foreground">
            {aggJobs.data.jobs.slice(0, 8).map((j) => (
              <li key={j.id}>
                #{j.id} sub={j.submission_id.slice(0, 8)} — {j.last_error?.slice(0, 80) || j.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <motionGrid
        list={list.data?.candidates ?? []}
        selectedId={selectedId}
        onSelect={setSelectedId}
        detail={detail.data}
        subs={subs}
        conflicts={conflicts}
        reviews={reviews}
        mergeTarget={mergeTarget}
        setMergeTarget={setMergeTarget}
        onApprove={() => {
          if (!selectedId) return;
          const ingredients = inciDraft
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          approve.mutate({ id: selectedId, ingredients, notes: reviewNotes });
        }}
        inciDraft={inciDraft}
        setInciDraft={setInciDraft}
        reviewNotes={reviewNotes}
        setReviewNotes={setReviewNotes}
        onReject={() => selectedId && reject.mutate(selectedId)}
        onMerge={() =>
          selectedId &&
          mergeTarget &&
          merge.mutate({ source: selectedId, target: mergeTarget })
        }
        onSplit={(submissionId) =>
          selectedId && split.mutate({ id: selectedId, submissionIds: [submissionId] })
        }
        linkCareId={linkCareId}
        setLinkCareId={setLinkCareId}
        onLinkExisting={() =>
          selectedId &&
          linkCareId &&
          linkExisting.mutate({ id: selectedId, careId: Number(linkCareId) })
        }
        onRequestInfo={() => selectedId && requestInfo.mutate(selectedId)}
        busy={
          approve.isPending ||
          reject.isPending ||
          merge.isPending ||
          split.isPending ||
          linkExisting.isPending ||
          requestInfo.isPending
        }
      />
    </div>
  );
}

function motionHeader() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Mahsulot tekshiruvi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Uch ustun: rasmlar → metadata → konflikt va qaror (merge/split)
      </p>
    </div>
  );
}

function buttonRow(p: {
  pending: number;
  conflicts: number;
  verified: number;
  submissions: number;
}) {
  return (
    <motionDivKpi pending={p.pending} conflicts={p.conflicts} verified={p.verified} submissions={p.submissions} />
  );
}

function motionDivKpi({
  pending,
  conflicts,
  verified,
  submissions,
}: {
  pending: number;
  conflicts: number;
  verified: number;
  submissions: number;
}) {
  return (
    <motionWrapper>
      <KPICard label="Kutilmoqda" value={pending} icon={ScanLine} />
      <KPICard label="Konflikt" value={conflicts} icon={ShieldAlert} />
      <KPICard label="Tasdiqlangan" value={verified} icon={Sparkles} />
      <KPICard label="Topshiruvlar" value={submissions} icon={Package} />
    </motionWrapper>
  );
}

function motionWrapper({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

type CandidateRow = {
  id: string;
  proposed_brand: string;
  proposed_product_name: string;
  proposed_barcode: string;
  submission_count: number;
  status: string;
  image_url?: string | null;
};

function motionGrid(props: {
  list: CandidateRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  detail: { candidate: CandidateRow; submissions: Array<Record<string, unknown>> } | undefined;
  subs: Array<Record<string, unknown>>;
  conflicts: Array<Record<string, unknown>>;
  reviews: Array<Record<string, unknown>>;
  mergeTarget: string;
  setMergeTarget: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onMerge: () => void;
  onSplit: (submissionId: string) => void;
  linkCareId: string;
  setLinkCareId: (v: string) => void;
  onLinkExisting: () => void;
  onRequestInfo: () => void;
  busy: boolean;
  inciDraft: string;
  setInciDraft: (v: string) => void;
  reviewNotes: string;
  setReviewNotes: (v: string) => void;
}) {
  const c = props.detail?.candidate;
  return (
    <motionGridLayout>
      {/* LEFT — gallery */}
      <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-semibold">Rasmlar</h2>
        <div className="grid grid-cols-2 gap-2">
          {props.subs.map((s) => {
            const imgs = (s.images ?? {}) as Record<string, string | null>;
            return Object.entries(imgs).map(([role, url]) =>
              url ? (
                <figure key={`${String(s.id)}-${role}`}>
                  <img src={url} alt={role} className="aspect-square w-full rounded-lg object-cover" />
                  <figcaption className="text-xs text-muted-foreground">{role}</figcaption>
                </figure>
              ) : null,
            );
          })}
        </div>
        <h2 className="pt-2 font-heading text-sm font-semibold">Nomzodlar</h2>
        <div className="max-h-48 space-y-1 overflow-y-auto">
          {props.list.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => props.onSelect(row.id)}
              className={`w-full rounded-lg border p-2 text-left text-sm ${
                props.selectedId === row.id ? "border-primary bg-muted" : "border-border"
              }`}
            >
              {row.proposed_brand} {row.proposed_product_name}
            </button>
          ))}
        </div>
      </section>

      {/* CENTER — metadata */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        {!c ? (
          <p className="text-sm text-muted-foreground">Nomzod tanlang.</p>
        ) : (
          <>
            <h2 className="font-heading text-lg font-semibold">
              {c.proposed_brand} {c.proposed_product_name}
            </h2>
            <p className="text-sm">Barcode: {c.proposed_barcode || "—"}</p>
            <p className="text-sm">Topshiruvlar: {c.submission_count}</p>
            <Badge>{c.status}</Badge>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">INCI tahrir (tasdiqlash uchun)</p>
              <textarea
                className="min-h-28 w-full rounded-lg border border-border px-2 py-2 font-mono text-xs"
                value={props.inciDraft}
                onChange={(e) => props.setInciDraft(e.target.value)}
                placeholder="Aqua, Sodium Laureth Sulfate, …"
              />
              <p className="text-[10px] text-muted-foreground">Vergul yoki yangi qator bilan ajrating.</p>
              <ul className="max-h-24 overflow-y-auto text-xs text-muted-foreground">
                {props.subs.map((s) => (
                  <li key={String(s.id)} className="border-b border-border py-1">
                    topshiruv {String(s.id).slice(0, 8)}:{" "}
                    {(s.ingredients as string[] | undefined)?.join(", ") || "—"}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      {/* RIGHT — conflicts & actions */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-heading text-sm font-semibold">Konfliktlar va tarix</h2>
        {props.conflicts.length === 0 ? (
          <p className="text-xs text-muted-foreground">Konflikt yo&apos;q.</p>
        ) : (
          <ul className="text-xs text-destructive">
            {props.conflicts.map((x, i) => (
              <li key={i}>{String(x.conflict_type)}</li>
            ))}
          </ul>
        )}
        {props.reviews.slice(0, 5).map((r, i) => (
          <p key={i} className="text-xs text-muted-foreground">
            {String(r.decision)} — {String(r.created_at ?? "")}
          </p>
        ))}
        <div className="space-y-1">
          <label className="text-xs">Tekshiruv eslatmalari</label>
          <textarea
            className="min-h-16 w-full rounded border border-border px-2 py-1 text-xs"
            value={props.reviewNotes}
            onChange={(e) => props.setReviewNotes(e.target.value)}
            placeholder="Nima uchun tasdiqlandi / rad etildi…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!props.selectedId || props.busy} onClick={props.onApprove}>
            Tasdiqlash
          </Button>
          <Button size="sm" variant="outline" disabled={!props.selectedId || props.busy} onClick={props.onReject}>
            Rad
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!props.selectedId || props.busy}
            onClick={props.onRequestInfo}
          >
            Qoʻshimcha maʼlumot
          </Button>
        </div>
        <div className="space-y-1">
          <label className="text-xs">Mavjud care_product ID (link)</label>
          <input
            className="w-full rounded border border-border px-2 py-1 text-xs"
            value={props.linkCareId}
            onChange={(e) => props.setLinkCareId(e.target.value)}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={!props.linkCareId || !props.selectedId || props.busy}
            onClick={props.onLinkExisting}
          >
            Link existing
          </Button>
        </div>
        <div className="space-y-1">
          <label className="text-xs">Birlashtirish (target ID)</label>
          <input
            className="w-full rounded border border-border px-2 py-1 text-xs"
            value={props.mergeTarget}
            onChange={(e) => props.setMergeTarget(e.target.value)}
          />
          <Button size="sm" variant="secondary" disabled={!props.mergeTarget || props.busy} onClick={props.onMerge}>
            Merge
          </Button>
        </div>
        {props.subs.length > 1 ? (
          <div className="space-y-1">
            <p className="text-xs font-semibold">Split (topshiruvni ajratish)</p>
            {props.subs.map((s) => (
              <Button
                key={String(s.id)}
                size="sm"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => props.onSplit(String(s.id))}
              >
                Ajrat: {String(s.barcode || s.id).slice(0, 12)}
              </Button>
            ))}
          </div>
        ) : null}
        <Link to="/admin/parvarish/missing-products" className="text-xs text-primary hover:underline">
          Yo&apos;q mahsulotlar jadvali
        </Link>
      </section>
    </motionGridLayout>
  );
}

function motionGridLayout({ children }: { children: React.ReactNode }) {
  return <motionGridClass>{children}</motionGridClass>;
}

function motionGridClass({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 xl:grid-cols-3">{children}</div>;
}