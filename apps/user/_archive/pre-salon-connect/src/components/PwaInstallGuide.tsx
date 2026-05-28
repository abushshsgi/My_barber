"use client";

import { ExternalLink, Share, Smartphone } from "lucide-react";
import {
  canShowIosInstallUi,
  getIosInstallMode,
  pwaInstallSiteUrl,
  resetPwaHintDismissed,
} from "@/utils/pwa-install";

export function PwaInstallGuide() {
  if (!canShowIosInstallUi()) return null;

  const mode = getIosInstallMode();
  const siteUrl = pwaInstallSiteUrl();

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Ilovani o‘rnatish (iPhone)</h2>

          {mode === "in_app" ? (
            <>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Hozir Telegram/Instagram ichidasiz. Safari yoki Chrome’da oching.
              </p>
              <a
                href={siteUrl}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
              >
                Brauzerda ochish
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          ) : (
            <>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
                <li>Safari yoki Chrome’da ushbu sayt ochiq bo‘lsin</li>
                <li>
                  Pastki <strong className="text-foreground">Share</strong> (↗) tugmasi
                </li>
                <li>
                  <strong className="text-foreground">Add to Home Screen</strong> yoki{" "}
                  <strong className="text-foreground">«На экран Домой»</strong>
                </li>
                <li>
                  <strong className="text-foreground">Add</strong> / Qoʻshish
                </li>
              </ol>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Share className="h-3.5 w-3.5 shrink-0" />
                Share ro‘yxatida pastga aylantiring
              </p>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              resetPwaHintDismissed();
              window.location.reload();
            }}
            className="text-[11px] text-muted-foreground underline underline-offset-2"
          >
            Yuqoridagi eslatmani qayta ko‘rsatish
          </button>
        </div>
      </div>
    </section>
  );
}
