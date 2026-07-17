import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import "./google-maps-types";

let configuredKey: string | null = null;
let mapsReady: Promise<typeof google.maps> | null = null;

/** Load Google Maps JS once for the given API key. */
export async function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (!apiKey) {
    throw new Error("Google Maps API key is missing.");
  }

  if (configuredKey !== apiKey) {
    setOptions({ key: apiKey, v: "weekly" });
    configuredKey = apiKey;
    mapsReady = null;
  }

  if (!mapsReady) {
    mapsReady = importLibrary("maps").then(() => google.maps);
  }

  return mapsReady;
}
