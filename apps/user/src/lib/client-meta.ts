import { Capacitor } from "@capacitor/core";
import { APP_BUILD_ID } from "@/lib/app-build-id";

export type ClientKind = "web" | "capacitor";

/** Login / auth so‘rovlariga qo‘shiladigan mijoz metadatalari. */
export function getAuthClientMeta(): {
  client_kind: ClientKind;
  app_version: string;
  device_name?: string;
} {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    return {
      client_kind: "web",
      app_version: APP_BUILD_ID || "",
    };
  }
  const platform = Capacitor.getPlatform();
  return {
    client_kind: "capacitor",
    app_version: APP_BUILD_ID || "",
    device_name:
      platform === "ios"
        ? "MySaloon App (iOS)"
        : platform === "android"
          ? "MySaloon App (Android)"
          : "MySaloon App",
  };
}
