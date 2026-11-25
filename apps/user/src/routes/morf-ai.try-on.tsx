import { createFileRoute } from "@tanstack/react-router";
import { seoLandingRouteOptions } from "@/seo/create-landing-route";

export const Route = createFileRoute("/morf-ai/try-on")({
  ...seoLandingRouteOptions("morf-ai-try-on", "uz"),
});
