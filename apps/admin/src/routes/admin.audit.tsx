import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, Search } from "lucide-react";
import { fetchAuditLog, type AdminAuditRow } from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

const ACTION_LABELS: Record<string, string> = {
  ledger_lookup: "Ledger qidiruv",
  wallet_adjust: "Hamyon tuzatish",
  gift_hold: "Sovg‘a hold",
  gift_release: "Sovg‘a release",
  gift_refund: "Sovg‘a refund",
  gift_dispute_open: "Sovg‘a dispute",
  gift_bulk_hold: "Bulk hold",
  create: "Yaratish",
  update: "Yangilash",
  delete: "O‘chirish",
};

const FILTER_ACTIONS = [
  { value: "all", label: "Barcha amallar" },
  { value: "ledger_lookup", label: "Ledger qidiruv" },
  { value: "wallet_adjust", label: "Hamyon tuzatish" },
  { value: "gift_hold", label: "Sovg‘a hold" },
  { value: "gift_refund", label: "Sovg‘a refund" },
  { value: "gift_release", label: "Sovg‘a release" },
  { value: "update", label: "Yangilash" },
  { value: "create", label: "Yaratish" },
  { value: "delete", label: "O‘chirish" },
];

function AuditPage() {
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["admin", "audit", q, action],
    queryFn: () => fetchAuditLog({ q, action }),
  });
  const data = query.data ?? [];

  const runSearch = () => setQ(draftQ.trim());

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Audit log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin amallari: kim, nima qildi, qaysi obyekt, IP va o‘zgarishlar.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Admin, amal, ID, IP…"
            className="h-11 rounded-xl pl-10"
          />
        </div>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
        >
          {FILTER_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <Button type="button" className="h-11 rounded-xl px-5" onClick={runSearch}>
          Filtrlash
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {query.isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : data.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Hozircha audit yozuvlari yo‘q yoki filtr bo‘yicha topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Admin</th>
                  <th className="px-6 py-3 font-medium">Amal</th>
                  <th className="px-6 py-3 font-medium">Obyekt</th>
                  <th className="px-6 py-3 font-medium">IP</th>
                  <th className="px-6 py-3 font-medium">Vaqt</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((a) => {
                  const open = expanded === a.id;
                  const hasMeta =
                    Object.keys(a.before_json || {}).length > 0 ||
                    Object.keys(a.after_json || {}).length > 0 ||
                    Boolean(a.target_id);
                  return (
                    <AuditRow
                      key={a.id}
                      row={a}
                      open={open}
                      hasMeta={hasMeta}
                      onToggle={() => setExpanded(open ? null : a.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AuditRow({
  row,
  open,
  hasMeta,
  onToggle,
}: {
  row: AdminAuditRow;
  open: boolean;
  hasMeta: boolean;
  onToggle: () => void;
}) {
  const actionLabel = ACTION_LABELS[row.action] || row.action;
  const metaPreview = useMemo(() => {
    const after = row.after_json || {};
    if (typeof after.reason === "string" && after.reason) return after.reason;
    if (typeof after.q === "string" && after.q) return `q: ${after.q}`;
    if (typeof after.amount === "string" || typeof after.amount === "number") {
      return `summa: ${after.amount}`;
    }
    return row.target_id ? `id: ${row.target_id.slice(0, 18)}…` : "";
  }, [row]);

  return (
    <>
      <tr className="hover:bg-background/50">
        <td className="px-6 py-3">
          <div className="flex items-center gap-2">
            <img src={row.admin_avatar} className="size-7 rounded-full object-cover" alt="" />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {row.admin_name || row.admin}
              </p>
              {row.admin_name && row.admin && row.admin_name !== row.admin ? (
                <p className="truncate text-[11px] text-muted-foreground">{row.admin}</p>
              ) : null}
            </div>
          </div>
        </td>
        <td className="px-6 py-3">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-foreground">
            {actionLabel}
          </span>
        </td>
        <td className="px-6 py-3 text-muted-foreground">
          <span className="font-mono text-xs">{row.target_type}</span>
          {row.target_name ? <> · {row.target_name}</> : null}
          {metaPreview ? (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
              {metaPreview}
            </span>
          ) : null}
        </td>
        <td className="px-6 py-3 font-mono text-xs tabular-nums text-muted-foreground">
          {row.ip || "—"}
        </td>
        <td className="px-6 py-3 tabular-nums text-muted-foreground">
          {format(new Date(row.created_at), "dd MMM yyyy HH:mm:ss")}
        </td>
        <td className="px-4 py-3">
          {hasMeta ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Tafsilot
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </button>
          ) : null}
        </td>
      </tr>
      {open ? (
        <tr className="bg-muted/30">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetaBlock title="Target ID" value={row.target_id || "—"} mono />
              <MetaBlock title="User-Agent" value={row.user_agent || "—"} />
              <MetaBlock title="Before" value={prettyJson(row.before_json)} mono />
              <MetaBlock title="After" value={prettyJson(row.after_json)} mono />
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function MetaBlock({
  title,
  value,
  mono,
}: {
  title: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <pre
        className={cn(
          "mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-foreground",
          mono && "font-mono",
        )}
      >
        {value}
      </pre>
    </div>
  );
}

function prettyJson(obj: Record<string, unknown>) {
  if (!obj || Object.keys(obj).length === 0) return "—";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
