/**
 * Minimal TanStack route tree for guest Explore bootstrap.
 * Avoids eager imports from the generated full `routeTree.gen.ts`.
 */
import { Route as rootRouteImport } from "./routes/__root";
import { Route as ExploreRouteImport } from "./routes/explore";
import { Route as LocaleExploreRouteImport } from "./routes/$locale.explore";
import { Route as ExploreStyleRouteImport } from "./routes/explore_.$styleId";
import { Route as ExploreCategoryRouteImport } from "./routes/explore_.category.$categoryId";
import { Route as AuthRouteImport } from "./routes/auth";
import { Route as IndexRouteImport } from "./routes/index";
import { Route as MorfTryOnRouteImport } from "./routes/morf-ai.try-on";
import { Route as LocaleMorfTryOnRouteImport } from "./routes/$locale.morf-ai.try-on";

const ExploreRoute = ExploreRouteImport.update({
  id: "/explore",
  path: "/explore",
  getParentRoute: () => rootRouteImport,
} as never);

const LocaleExploreRoute = LocaleExploreRouteImport.update({
  id: "/$locale/explore",
  path: "/$locale/explore",
  getParentRoute: () => rootRouteImport,
} as never);

const ExploreStyleRoute = ExploreStyleRouteImport.update({
  id: "/explore/$styleId",
  path: "/explore/$styleId",
  getParentRoute: () => rootRouteImport,
} as never);

const ExploreCategoryRoute = ExploreCategoryRouteImport.update({
  id: "/explore/category/$categoryId",
  path: "/explore/category/$categoryId",
  getParentRoute: () => rootRouteImport,
} as never);

const AuthRoute = AuthRouteImport.update({
  id: "/auth",
  path: "/auth",
  getParentRoute: () => rootRouteImport,
} as never);

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRouteImport,
} as never);

const MorfTryOnRoute = MorfTryOnRouteImport.update({
  id: "/morf-ai/try-on",
  path: "/morf-ai/try-on",
  getParentRoute: () => rootRouteImport,
} as never);

const LocaleMorfTryOnRoute = LocaleMorfTryOnRouteImport.update({
  id: "/$locale/morf-ai/try-on",
  path: "/$locale/morf-ai/try-on",
  getParentRoute: () => rootRouteImport,
} as never);

export const publicRouteTree = rootRouteImport.addChildren([
  IndexRoute,
  ExploreRoute,
  LocaleExploreRoute,
  ExploreStyleRoute,
  ExploreCategoryRoute,
  AuthRoute,
  MorfTryOnRoute,
  LocaleMorfTryOnRoute,
]);