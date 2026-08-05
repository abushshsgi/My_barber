import { APP_BUILD_ID } from "@/lib/app-build-id";

export type ClientKind = "web" | "capacitor";

/** Login / auth so‘rovlariga qo‘shiladigan mijoz metadatalari. */
export function getAuthClientMeta(): {
  client_kind: ClientKind;
  app_version: string;
  device_name?: string;
} {
  return {
    client_kind: "web",
    app_version: APP_BUILD_ID || "",
  };
}
