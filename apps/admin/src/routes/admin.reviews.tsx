import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Star } from "lucide-react";
import { fetchAdminReviews } from "@/lib/admin-api";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const [barber, setBarber] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState({
    barber: "",
    min_rating: 0,
    date_from: "",
    date_to: "",
  });

  const reviewsQ = useQuery({
    queryKey: ["admin", "reviews", applied],
    queryFn: () => fetchAdminReviews(applied),
  });

  const data = reviewsQ.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Sharhlar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Mijozlar tomonidan qoldirilgan baholar va izohlar.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Sartarosh ismi
          </label>
          <Input
            placeholder="Sartarosh nomini yozing..."
            value={barber}
            onChange={(e) => setBarber(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Minimal reyting
          </label>
          <Select value={minRating} onValueChange={setMinRating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Barchasi</SelectItem>
              <SelectItem value="3">3 va undan yuqori</SelectItem>
              <SelectItem value="4">4 va undan yuqori</SelectItem>
              <SelectItem value="5">Faqat 5</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Dan
          </label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="w-full sm:w-44">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Gacha
          </label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              setApplied({
                barber,
                min_rating: Number(minRating),
                date_from: dateFrom,
                date_to: dateTo,
              })
            }
          >
            Qo'llash
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setBarber("");
              setMinRating("0");
              setDateFrom("");
              setDateTo("");
              setApplied({ barber: "", min_rating: 0, date_from: "", date_to: "" });
            }}
          >
            Tozalash
          </Button>
        </div>
      </div>

      {reviewsQ.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} className="min-h-[140px]" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-card">
          <EmptyState
            title="Sharhlar yo'q"
            description="Tanlangan filter bo'yicha sharhlar topilmadi."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((r) => (
            <div key={r.id} className="bg-card rounded-2xl border border-border shadow-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-foreground">{r.client_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Sartarosh: <span className="text-foreground font-medium">{r.barber_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
              <p className="mt-3 text-sm text-foreground leading-relaxed">"{r.comment}"</p>
              <div className="mt-3 text-xs text-muted-foreground">
                {format(new Date(r.created_at), "dd MMM yyyy")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
