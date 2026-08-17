import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Flag, HelpCircle, LifeBuoy } from "lucide-react";
import { fetchTickets, type AdminTicket } from "@/lib/admin-api";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { KPICard } from "@/components/admin/KPICard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/morph-ai/support")({
  component: MorphSupportPage,
});

const KIND_TABS = [
  { key: "all", label: "Hammasi", kind: "morph" as const },
  { key: "help", label: "Yordam", kind: "morph_help" as const },
  { key: "problem", label: "Muammolar", kind: "morph_problem" as const },
] as const;

const STATUS_TABS = [
  { key: "all", label: "Barcha holat" },
  { key: "open", label: "Ochiq" },
  { key: "pending", label: "Kutilmoqda" },
  { key: "resolved", label: "Hal qilindi" },
  { key: "closed", label: "Yopilgan" },
] as const;

function kindLabel(category?: string) {
  if (category === "morph_ai:problem") return "Muammo";
  if (category === "morph_ai:help") return "Yordam";
  return "Morf AI";
}

function MorphSupportPage() {
  const [kindTab, setKindTab] = useState<(typeof KIND_TABS)[number]["key"]>("all");
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]["key"]>("all");
  const kind = KIND_TABS.find((t) => t.key === kindTab)?.kind ?? "morph";

  const q = useQuery({
    queryKey: ["admin", "tickets", "morph", kind, status],
    queryFn: () => fetchTickets({ status, kind }),
  });
  const allQ = useQuery({
    queryKey: ["admin", "tickets", "morph", "morph", "all"],
    queryFn: () => fetchTickets({ status: "all", kind: "morph" }),
  });

  const data = q.data ?? [];
  const all = allQ.data ?? [];
  const openHelp = useMemo(
    () =>
      all.filter(
        (t) => t.category === "morph_ai:help" && (t.status === "open" || t.status === "pending"),
      ).length,
    [all],
  );
  const openProblem = useMemo(
    () =>
      all.filter(
        (t) => t.category === "morph_ai:problem" && (t.status === "open" || t.status === "pending"),
      ).length,
    [all],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Morf AI yordam</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Userlardan kelgan yordam so&apos;rovlari va muammo xabarlari. Shu yerdan javob bering va
          hal qiling.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard label="Ochiq yordam" value={String(openHelp)} />
        <KPICard label="Ochiq muammolar" value={String(openProblem)} />
        <KPICard label="Jami murojaat" value={String(all.length)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {KIND_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setKindTab(tab.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                kindTab === tab.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.key === "help" ? (
                <HelpCircle className="size-3.5" />
              ) : tab.key === "problem" ? (
                <Flag className="size-3.5" />
              ) : (
                <LifeBuoy className="size-3.5" />
              )}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                status === tab.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : data.length === 0 ? (
          <EmptyState
            title="Murojaat yo'q"
            description="Bu filterda Morph AI yordam yoki muammo xabari yo'q."
          />
        ) : (
          <div className="divide-y divide-border">
            {data.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: AdminTicket }) {
  const problem = ticket.category === "morph_ai:problem";
  return (
    <Link
      to="/admin/morph-ai/support/$ticketId"
      params={{ ticketId: ticket.id }}
      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-background/50"
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-border",
          problem ? "bg-destructive/10 text-destructive" : "bg-info/15 text-info",
        )}
      >
        {problem ? <Flag className="size-4" /> : <HelpCircle className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-foreground">{ticket.subject}</span>
          {ticket.unread > 0 ? <span className="size-2 rounded-full bg-destructive" /> : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {ticket.user_name} · {kindLabel(ticket.category)}
        </p>
      </div>
      <span
        className={cn(
          "hidden rounded-md px-2 py-0.5 text-xs font-medium sm:inline",
          ticket.status === "resolved"
            ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
            : ticket.status === "open"
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
              : ticket.status === "closed"
                ? "bg-muted text-muted-foreground"
                : "bg-sky-500/15 text-sky-800 dark:text-sky-200",
        )}
      >
        {ticket.status === "resolved"
          ? "Hal qilindi"
          : ticket.status === "open"
            ? "Ochiq"
            : ticket.status === "pending"
              ? "Kutilmoqda"
              : ticket.status === "closed"
                ? "Yopilgan"
                : ticket.status}
      </span>
      <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
        {format(new Date(ticket.updated_at), "dd MMM HH:mm")}
      </span>
    </Link>
  );
}
