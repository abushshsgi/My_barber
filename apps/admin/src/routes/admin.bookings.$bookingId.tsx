import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { fetchAdminBookingDetail } from "@/lib/admin-api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/bookings/$bookingId")({
  component: BookingDetailPage,
});

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Naqd",
  online: "Onlayn",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_applicable: "Talab qilinmaydi",
  pending: "Kutilmoqda",
  paid: "To'langan",
  refunded: "Qaytarilgan",
};

function BookingDetailPage() {
  const { bookingId } = Route.useParams();

  const bookingQ = useQuery({
    queryKey: ["admin", "booking", bookingId],
    queryFn: () => fetchAdminBookingDetail(bookingId),
  });

  const b = bookingQ.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" asChild>
        <Link to="/admin/bookings">
          <ArrowLeft className="size-4" />
          Bronlar
        </Link>
      </Button>

      {bookingQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : bookingQ.isError ? (
        <p className="text-sm text-destructive">{(bookingQ.error as Error).message}</p>
      ) : b ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold">Bron #{b.id}</h1>
              <p className="mt-1 font-mono text-sm font-semibold text-muted-foreground">
                {b.order_number}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {format(new Date(b.start_at), "dd MMMM yyyy, HH:mm")}
              </p>
            </div>
            <StatusBadge status={b.status} />
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Mijoz</dt>
              <dd className="mt-1 font-medium">{b.client_name}</dd>
              {b.client_phone ? (
                <dd className="text-xs text-muted-foreground">{b.client_phone}</dd>
              ) : null}
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Sartarosh</dt>
              <dd className="mt-1 font-medium">{b.barber_name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Salon</dt>
              <dd className="mt-1 font-medium">{b.salon_name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Jami narx</dt>
              <dd className="mt-1 font-medium tabular-nums">{b.price.toLocaleString("uz-UZ")} so'm</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">To'lov usuli</dt>
              <dd className="mt-1 font-medium">{PAYMENT_METHOD_LABELS[b.payment_method] || b.payment_method || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">To'lov holati</dt>
              <dd className="mt-1 font-medium">{PAYMENT_STATUS_LABELS[b.payment_status] || b.payment_status || "—"}</dd>
              {b.paid_at ? (
                <dd className="text-xs text-muted-foreground">
                  {format(new Date(b.paid_at), "dd.MM.yyyy HH:mm")}
                </dd>
              ) : null}
            </div>
          </dl>

          {b.lines && b.lines.length > 0 ? (
            <div className="mt-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Xizmatlar</p>
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {b.lines.map((line, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span>{line.service_name}</span>
                    <span className="tabular-nums font-medium">
                      {line.price.toLocaleString("uz-UZ")} so'm
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
