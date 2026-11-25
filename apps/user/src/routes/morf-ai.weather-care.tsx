import { createFileRoute } from "@tanstack/react-router";
import { seoLandingRouteOptions } from "@/seo/create-landing-route";

export const Route = createFileRoute("/morf-ai/weather-care")({
  ...seoLandingRouteOptions("morf-ai-weather-care", "uz"),
});