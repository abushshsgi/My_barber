import { useMemo, useState } from "react";
import type { Booking } from "@/components/barber/BarberContext";
import { useBarberBookingsQuery } from "@/hooks/use-barber-queries";
import type { BookingsTabId } from "./types";

export const BOOKINGS_TABS: { id: BookingsTabId; label: string }[] = [
  { id: "all", label: "Hammasi" },
  { id: "pending", label: "Yangi" },
  { id: "accepted", label: "Tasdiqlangan" },
  { id: "in_progress", label: "Davom etmoqda" },
  { id: "completed", label: "Yakunlangan" },
  { id: "cancelled", label: "Bekor" },
  { id: "rejected", label: "Rad etilgan" },
];

export function useBookingsPage() {
  const { data: bookings = [], isLoading, isFetching } = useBarberBookingsQuery();
  const [tab, setTab] = useState<BookingsTabId>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    let rows = tab === "all" ? bookings : bookings.filter((b) => b.status === tab);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (b) => b.client.toLowerCase().includes(q) || b.service.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [bookings, tab, query]);

  const stats = useMemo(
    () => ({
      pending: bookings.filter((b) => b.status === "pending").length,
      active: bookings.filter((b) => b.status === "in_progress").length,
      today: bookings.filter((b) => b.date === "Bugun").length,
      total: bookings.length,
    }),
    [bookings],
  );

  const tabCount = (id: BookingsTabId) =>
    id === "all" ? bookings.length : bookings.filter((b) => b.status === id).length;

  return {
    bookings,
    filtered,
    stats,
    tab,
    setTab,
    query,
    setQuery,
    tabCount,
    isLoading,
    isFetching,
  };
}

export type BookingsPageState = ReturnType<typeof useBookingsPage>;

export function groupByStatus(rows: Booking[]): { status: Booking["status"]; items: Booking[] }[] {
  const order: Booking["status"][] = [
    "in_progress",
    "pending",
    "accepted",
    "completed",
    "cancelled",
    "rejected",
  ];
  return order
    .map((status) => ({ status, items: rows.filter((b) => b.status === status) }))
    .filter((g) => g.items.length > 0);
}
