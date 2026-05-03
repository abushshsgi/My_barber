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

export const Route = createFileRoute("/admin/bookings")({
  component: BookingsPage,
});

const STATUS_TABS = [
  { key: "all", label: "Hammasi" },
  { key: "pending", label: "Kutilmoqda" },
  { key: "in_progress", label: "Kresloda" },
  { key: "completed", label: "Yakunlangan" },
  { key: "cancelled", label: "Bekor qilingan" },
] as const;

type Tab = (typeof STATUS_TABS)[number]["key"];

function BookingsPage() {
  const [tab, setTab] = useState<Tab>("all");

  const [page, setPage] = useState(1);

  const bookingsQ = useQuery({
    queryKey: ["admin", "bookings", { status: tab, page }],
    queryFn: () => fetchAdminBookings({ status: tab, page }),
  });

  const data = bookingsQ.data?.results ?? [];
  const pag = bookingsQ.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Bronlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Real vaqt rejimida barcha bronlash hodisalari.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 overflow-x-auto max-w-full">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
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
        {bookingsQ.isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : data.length === 0 ? (
          <EmptyState
            title="Bronlar topilmadi"
            description="Tanlangan filter bo'yicha bron yo'q."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-medium">ID</th>
                    <th className="px-6 py-3 font-medium">Mijoz</th>
                    <th className="px-6 py-3 font-medium">Sartarosh / Salon</th>
                    <th className="px-6 py-3 font-medium">Vaqt</th>
                    <th className="px-6 py-3 font-medium text-right">Narx</th>
                    <th className="px-6 py-3 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((b) => (
                    <tr key={b.id} className="hover:bg-background/50">
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{b.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.client_avatar}
                            alt=""
                            className="size-8 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-medium text-foreground">{b.client_name}</div>
                            <div className="text-xs text-muted-foreground">{b.service}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{b.barber_name}</div>
                        <div className="text-xs text-muted-foreground">{b.salon_name}</div>
                      </td>
                      <td className="px-6 py-4 tabular-nums text-foreground">
                        {format(new Date(b.start_at), "dd MMM yyyy, HH:mm")}
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-foreground font-medium">
                        {b.price.toLocaleString()} so'm
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={mapBookingStatus(b.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pag ? (
              <Pagination
                page={pag.page}
                totalPages={pag.total_pages}
                count={pag.count}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function mapBookingStatus(
  s: string,
): "pending" | "confirmed" | "in_chair" | "completed" | "cancelled" {
  if (s === "accepted") return "confirmed";
  if (s === "in_progress") return "in_chair";
  if (s === "completed") return "completed";
  if (s === "cancelled" || s === "rejected") return "cancelled";
  return "pending";
}
