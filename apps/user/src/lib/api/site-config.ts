import { apiJson } from "@/lib/api/client";

export type SiteConfig = {
  maintenance_banner_enabled: boolean;
  updated_at: string | null;
};

export async function fetchSiteConfig(): Promise<SiteConfig> {
  return apiJson<SiteConfig>("/api/v1/site/config/");
}
