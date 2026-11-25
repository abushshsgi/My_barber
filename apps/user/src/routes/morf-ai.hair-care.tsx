import { createFileRoute } from "@tanstack/react-router";
import { seoLandingRouteOptions } from "@/seo/create-landing-route";

export const Route = createFileRoute("/morf-ai/hair-care")({
  ...seoLandingRouteOptions("morf-ai-hair-care", "uz"),
});