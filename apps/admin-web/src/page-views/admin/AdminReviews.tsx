"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminReviews, type AdminReviewRow } from "@/lib/admin-api";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const AdminReviews = () => {
  const [barber, setBarber] = useState("");
  const [minRating, setMinRating] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [applied, setApplied] = useState({
    barber: "",
    min_rating: "",
    date_from: "",
    date_to: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "reviews", applied],
    queryFn: () =>
      fetchAdminReviews({
        barber: applied.barber || undefined,
        min_rating: applied.min_rating || undefined,
        date_from: applied.date_from || undefined,
        date_to: applied.date_to || undefined,
      }),
  });

  const rows = data ?? [];

  const applyFilters = () => {
    setApplied({
      barber: barber.trim(),
      min_rating: minRating.trim(),
      date_from: dateFrom,
      date_to: dateTo,
    });
  };

  const clearFilters = () => {
    setBarber("");
    setMinRating("");
    setDateFrom("");
    setDateTo("");
    setApplied({ barber: "", min_rating: "", date_from: "", date_to: "" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 text-center text-destructive">
        <AlertCircle className="mx-auto mb-2 h-10 w-10" />
        {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pb-4 pt-6">
        <h1 className="mb-1 text-xl font-bold">Sharhlar</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Filtrlar API orqali (barber id, reyting, sana oralig‘i)
        </p>

        <Card className="mb-4 space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Barber ID"
              value={barber}
              onChange={(e) => setBarber(e.target.value)}
              className="h-10"
            />
            <Input
              placeholder="Min reyting (1–5)"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="h-10"
            />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Qo‘llash
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Tozalash
            </Button>
          </div>
        </Card>

        <Card className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Mijoz</TableHead>
                <TableHead>Sartarosh</TableHead>
                <TableHead>Reyting</TableHead>
                <TableHead>Matn</TableHead>
                <TableHead>Vaqt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r: AdminReviewRow) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                    {r.author_email}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm text-muted-foreground">
                    {r.barber_email}
                  </TableCell>
                  <TableCell className="text-sm">{r.rating}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                    {r.text || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {r.created_at ? format(new Date(r.created_at), "d MMM yyyy HH:mm") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Sharh yo&apos;q</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminReviews;
