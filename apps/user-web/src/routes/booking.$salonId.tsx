import { createFileRoute } from "@tanstack/react-router";
import BookingFlow from "@/page-views/BookingFlow";

export const Route = createFileRoute("/booking/$salonId")({
  component: BookingFlow,
});

