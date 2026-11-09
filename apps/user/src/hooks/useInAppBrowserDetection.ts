import { useState } from "react";
import {
  detectInAppBrowser,
  readBrowserSignals,
  type InAppBrowserInfo,
} from "@/lib/external-browser";

export function useInAppBrowserDetection(): InAppBrowserInfo {
  const [info] = useState(() => detectInAppBrowser(readBrowserSignals()));
  return info;
}
