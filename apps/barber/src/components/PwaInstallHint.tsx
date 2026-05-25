"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Share, X } from "lucide-react";
import {
  canShowIosInstallUi,
  dismissPwaHint,
  getIosInstallMode,
  isPwaHintDismissed,
  pwaInstallSiteUrl,
} from "@/utils/pwa-install";

export function PwaInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canShowIosInstallUi() || isPwaHintDismissed()) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const mode = getIosInstallMode();
  const siteUrl = pwaInstallSiteUrl();

  function close() {
    dismissPwaHint();
    setVisible(false);
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-[100] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 text-foreground shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {mode === "safari" ? (
            <Share className="h-4 w-4 text-primary" aria-hidden />
          ) : (
            <ExternalLink className="h-4 w-4 text-primary" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold">Partner panelini o‘rnating</p>

          {mode === "in_app" && (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Telegram ichida «Domoy» chiqmaydi. Avval <strong>Safari</strong>da oching.
              </p>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
              >
                Safari’da ochish
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}

          {mode === "other_browser" && (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                iPhone’da faqat <strong>Safari</strong>. Chrome’da «На экран Домой» yo‘q.
              </p>
              <a
                href={siteUrl}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
              >
                Safari’da ochish
              </a>
            </>
          )}

          {mode === "safari" && (
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
              <li>
                Pastdagi <strong className="text-foreground">Share</strong> (↗) tugmasi
              </li>
              <li>
                <strong className="text-foreground">Add to Home Screen</strong> /{" "}
                <strong className="text-foreground">«На экран Домой»</strong>
              </li>
              <li>
                <strong className="text-foreground">Add</strong> / Qoʻshish
              </li>
            </ol>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
