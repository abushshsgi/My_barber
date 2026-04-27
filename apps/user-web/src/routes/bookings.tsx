import { createFileRoute } from "@tanstack/react-router";
import MyBookings from "@/page-views/MyBookings";

export const Route = createFileRoute("/bookings")({
  component: MyBookings,
});

