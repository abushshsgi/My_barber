import { createFileRoute, Outlet } from "@tanstack/react-router";

type ExploreGenSearch = {
  key?: string;
};

export const Route = createFileRoute("/dev/explore-gen")({
  validateSearch: (search: Record<string, unknown>): ExploreGenSearch => ({
    key: typeof search.key === "string" ? search.key : undefined,
  }),
  component: ExploreGenLayout,
});

function ExploreGenLayout() {
  return <Outlet />;
}
