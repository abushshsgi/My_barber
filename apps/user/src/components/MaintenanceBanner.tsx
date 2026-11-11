import { useEffect, useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSiteConfig } from "@/hooks/use-site-config";

const STORAGE_KEY = "mysaloon.maintenanceBanner.dismissed";

const BANNER_FONT = {
  fontSize: "14px",
  lineHeight: 1.35,
  fontWeight: 600,
} as const;

function readVisible() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

/** Barcha sahifalar tepasidagi bir xil texnik ishlar ogohlantirishi. */
export function MaintenanceBanner() {
  const { t } = useTranslation();
  const siteConfig = useSiteConfig();
  const bannerEnabled = siteConfig.data?.maintenance_banner_enabled ?? false;
  const [dismissed, setDismissed] = useState(() => !readVisible());
  const [bar, setBar] = useState<HTMLDivElement | null>(null);
  const visible = bannerEnabled && !dismissed;

  useEffect(() => {
    setDismissed(!readVisible());
  }, []);

  useLayoutEffect(() => {
    const html = document.documentElement;
    if (!visible || !bar) {
      html.removeAttribute("data-maint-banner");
      html.style.removeProperty("--maint-banner-offset");
      return;
    }

    const apply = () => {
      html.setAttribute("data-maint-banner", "");
      html.style.setProperty("--maint-banner-offset", `${bar.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      html.removeAttribute("data-maint-banner");
      html.style.removeProperty("--maint-banner-offset");
    };
  }, [visible, bar]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* sessionStorage yopiq bo'lsa ham yopiladi */
    }
    setDismissed(true);
  };

  return (
    <div
      ref={setBar}
      role="status"
      className="fixed inset-x-0 top-0 z-[250] bg-red-600 text-white"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", ...BANNER_FONT }}
    >
      <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center px-2 py-2">
        <span aria-hidden="true" />
        <p className="m-0 text-center" style={BANNER_FONT}>
          {t("maintenance.banner")}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("common.close")}
          className="flex h-8 w-8 items-center justify-center justify-self-end rounded-full text-white hover:bg-white/15"
          style={{ fontSize: "18px", lineHeight: 1, fontWeight: 600 }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
