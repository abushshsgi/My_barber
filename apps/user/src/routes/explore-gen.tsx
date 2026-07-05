import { createFileRoute, redirect } from "@tanstack/react-router";

type ExploreGenRedirectSearch = {
  key?: string;
};

export const Route = createFileRoute("/explore-gen")({
  validateSearch: (search: Record<string, unknown>): ExploreGenRedirectSearch => ({
    key: typeof search.key === "string" ? search.key : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/dev/explore-gen",
      search: search.key ? { key: search.key } : {},
    });
  },
});
