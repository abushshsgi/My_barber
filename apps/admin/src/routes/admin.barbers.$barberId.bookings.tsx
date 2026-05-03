import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchAdminBookings, PAGE_SIZE } from "@/lib/admin-api";
import { Pagination } from "@/components/admin/Pagination";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/barbers/$barberId/bookings")({
  component: BarberBookingsPage,
});

const STATUS_TABS = [
  { key: "all", label: "Hammasi" },
  { key: "pending", label: "Kutilmoqda" },
  { key: "in_progress", label: "Jarayonda" },
  { key: "completed", label: "Yakunlangan" },
  { key: "cancelled", label: "Bekor" },
] as const;

type Tab = (typeof STATUS_TABS)[number]["key"];

function BarberBookingsPage() {
  const { barberId } = Route.useParams();
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["admin", "bookings", { barber: barberId, status: tab, page }],
    queryFn: () =>
      fetchAdminBookings({
        barber: barberId,
        status: tab,
        page,
      }),
  });

  const data = q.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">Bronlar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Faqat ushbu sartaroshga tegishli bronlar (sahifalangan).
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-card p-1 overflow-x-auto max-w-full gap-0.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data || data.results.length === 0 ? (
          <EmptyState
            title="Bronlar yo‘q"
            description="Tanlangan filter bo‘yicha yozuv topilmadi."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Mijoz</th>
                    <th className="px-4 py-3 font-medium">Salon</th>
                    <th className="px-4 py-3 font-medium">Vaqt</th>
                    <th className="px-4 py-3 font-medium text-right">Narx</th>
                    <th className="px-4 py-3 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{b.client_name}</div>
                        <div className="text-xs text-muted-foreground">{b.service}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.salon_name}</td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        {format(new Date(b.start_at), "dd.MM.yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {b.price.toLocaleString()} so'm
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={mapBookingBadge(b.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              count={data.count}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

function mapBookingBadge(
  s: string,
): "pending" | "confirmed" | "in_chair" | "completed" | "cancelled" {
  if (s === "accepted") return "confirmed";
  if (s === "in_progress") return "in_chair";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  return "pending";
}
