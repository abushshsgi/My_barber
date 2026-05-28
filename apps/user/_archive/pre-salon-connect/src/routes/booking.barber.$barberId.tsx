import { createFileRoute } from "@tanstack/react-router";
import IndependentBookingFlow from "@/page-views/IndependentBookingFlow";

export const Route = createFileRoute("/booking/barber/$barberId")({
  component: IndependentBookingFlow,
});

