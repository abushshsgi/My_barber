import { apiJson } from "@/lib/api/client";

export type SiteConfig = {
  maintenance_banner_enabled: boolean;
  updated_at: string | null;
  /** Web GSI client when VITE_GOOGLE_CLIENT_ID was not set at build time. */
  google_oauth_client_id?: string;
};

export async function fetchSiteConfig(): Promise<SiteConfig> {
  return apiJson<SiteConfig>("/api/v1/site/config/");
}
