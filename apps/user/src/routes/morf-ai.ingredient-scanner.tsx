import { createFileRoute } from "@tanstack/react-router";
import { seoLandingRouteOptions } from "@/seo/create-landing-route";

export const Route = createFileRoute("/morf-ai/ingredient-scanner")({
  ...seoLandingRouteOptions("morf-ai-ingredient-scanner", "uz"),
});