"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminBookings, type AdminBookingRow } from "@/lib/admin-api";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const AdminBookings = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: fetchAdminBookings,
  });

  const rows = data ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 text-center text-destructive">
        <AlertCircle className="h-10 w-10 mx-auto mb-2" />
        {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold mb-1">Bandlar</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Barcha bandlar API orqali (oxirgi yozuvlar)
        </p>
        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salon</TableHead>
                <TableHead>Mijoz</TableHead>
                <TableHead>Vaqt</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead className="text-right">Summa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b: AdminBookingRow) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium text-sm max-w-[140px] truncate">
                    {b.salon_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {b.start_at ? format(new Date(b.start_at), "d MMM yyyy HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{b.status}</TableCell>
                  <TableCell className="text-right text-sm">{b.total_price ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="p-6 text-center text-muted-foreground text-sm">Band yo&apos;q</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminBookings;
