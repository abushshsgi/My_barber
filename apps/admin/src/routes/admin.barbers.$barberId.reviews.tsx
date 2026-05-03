import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Star } from "lucide-react";
import { fetchAdminReviews, PAGE_SIZE } from "@/lib/admin-api";
import { Pagination } from "@/components/admin/Pagination";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/barbers/$barberId/reviews")({
  component: BarberReviewsPage,
});

function BarberReviewsPage() {
  const { barberId } = Route.useParams();
  const [page, setPage] = useState(1);

  const q = useQuery({
    queryKey: ["admin", "reviews", { barber: barberId, page }],
    queryFn: () =>
      fetchAdminReviews({
        barber: barberId,
        page,
      }),
  });

  const data = q.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-semibold tracking-tight">Sharhlar</h2>
        <p className="text-sm text-muted-foreground mt-1">Ushbu sartaroshga qoldirilgan baholar.</p>
      </div>

      {q.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} className="min-h-[140px]" />
          ))}
        </div>
      ) : !data || data.results.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-card">
          <EmptyState title="Sharhlar yo‘q" description="Hozircha izohlar mavjud emas." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.results.map((r) => (
              <div
                key={r.id}
                className="bg-card rounded-2xl border border-border shadow-card p-5 hover:border-foreground/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{r.client_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {r.barber_name}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-3.5",
                          i < r.rating
                            ? "fill-foreground text-foreground"
                            : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm text-foreground leading-relaxed line-clamp-6">
                  {r.comment ? `«${r.comment}»` : "—"}
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  {format(new Date(r.created_at), "dd.MM.yyyy HH:mm")}
                </div>
              </div>
            ))}
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
  );
}
