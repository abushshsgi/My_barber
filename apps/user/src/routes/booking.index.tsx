import { createFileRoute } from "@tanstack/react-router";
import { seoLandingRouteOptions } from "@/seo/create-landing-route";

export const Route = createFileRoute("/booking/")({
  ...seoLandingRouteOptions("booking-landing", "uz"),
});
