import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { MorphAiCareProductsPage } from "@/components/ai-style/MorphAiCareProductsPage";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/ai-style_/care_/products")({
  head: () => ({
    meta: [
      { title: "Soch vositalari — mysaloon.uz" },
      {
        name: "description",
        content: "Shampun, balzam va boshqa soch vositalarining tarkibi va qo‘llanishi.",
      },
    ],
  }),
  component: CareProductsRoute,
});

function CareProductsRoute() {
  useEffect(() => {
    trackEvent("shampoo_product_viewed", { surface: "care_products" }, { dedupeKey: "care-products" });
  }, []);
  return <MorphAiCareProductsPage />;
}
