import { useCallback, useMemo, useState } from "react";
import { useDiscoveryLocation } from "@/hooks/use-discovery-location";
import { useMe } from "@/hooks/use-me";
import { useRegions } from "@/hooks/use-regions";
import { hasValidUserSession } from "@/lib/api/client";
import {
  CATALOG_SCOPE_ALL,
  isCatalogScopeAll,
  readCatalogScope,
  writeCatalogScope,
  type CatalogScopeValue,
} from "@/lib/catalog-scope";

export type CatalogScopeState = {
  /** `all` yoki viloyat kodi */
  scope: CatalogScopeValue;
  /** API ga yuboriladigan region; nationwide bo‘lsa undefined */
  region: string | undefined;
  /** Nationwide uchun `scope=all` query */
  apiScope: "all" | undefined;
  /** Yaqin (GPS) ro‘yxat — faqat login + mahalliy hudud */
  useNearby: boolean;
  scopeLabel: string;
  setScope: (value: CatalogScopeValue) => void;
  isNationwide: boolean;
  isLoggedIn: boolean;
  profileRegion: string | undefined;
};

/**
 * Mehmon: default butun O‘zbekiston (GPS filter yo‘q).
 * Login: default profil viloyati; home dan «O‘zbekiston» tanlansa — hamma.
 */
export function useCatalogScope(): CatalogScopeState {
  const loggedIn = hasValidUserSession();
  const { data: me } = useMe();
  const { data: regions = [] } = useRegions();
  const discovery = useDiscoveryLocation(loggedIn);
  const profileRegion = me?.region?.trim() || undefined;

  const [stored, setStored] = useState<CatalogScopeValue | null>(() => readCatalogScope());

  const scope = useMemo((): CatalogScopeValue => {
    if (stored) return stored;
    if (loggedIn && profileRegion) return profileRegion;
    if (loggedIn && discovery.region) return discovery.region;
    return CATALOG_SCOPE_ALL;
  }, [stored, loggedIn, profileRegion, discovery.region]);

  const isNationwide = isCatalogScopeAll(scope);

  const setScope = useCallback((value: CatalogScopeValue) => {
    writeCatalogScope(value);
    setStored(value);
  }, []);

  const scopeLabel = useMemo(() => {
    if (isNationwide) return "O‘zbekiston";
    return regions.find((r) => r.value === scope)?.label || scope;
  }, [isNationwide, regions, scope]);

  return {
    scope,
    region: isNationwide ? undefined : scope,
    apiScope: isNationwide ? "all" : undefined,
    useNearby: Boolean(
      loggedIn &&
        !isNationwide &&
        (profileRegion || discovery.region) &&
        scope === (profileRegion || discovery.region),
    ),
    scopeLabel,
    setScope,
    isNationwide,
    isLoggedIn: loggedIn,
    profileRegion,
  };
}
