import { createFileRoute, redirect } from "@tanstack/react-router";

type ConsultSearch = {
  preview?: "barber";
  styleId?: string;
  styleName?: string;
};

export const Route = createFileRoute("/ai-style_/consult")({
  validateSearch: (search: Record<string, unknown>): ConsultSearch => ({
    preview: search.preview === "barber" ? "barber" : undefined,
    styleId:
      typeof search.styleId === "string" && search.styleId.trim()
        ? search.styleId.trim()
        : undefined,
    styleName:
      typeof search.styleName === "string" && search.styleName.trim()
        ? search.styleName.trim()
        : undefined,
  }),
  beforeLoad: () => {
    throw redirect({ to: "/ai-style" });
  },
  component: () => null,
});
