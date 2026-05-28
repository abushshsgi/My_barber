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
      className="fixed inset-x-4 top-[max(0.75rem,env(safe-area-inset-top))] z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-[#171512] p-4 text-white shadow-lg"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
          <Share className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold">Ilovani uy ekraniga qo‘shing</p>

          {mode === "in_app" ? (
            <>
              <p className="text-xs leading-relaxed text-white/75">
                Telegram yoki boshqa ilova ichida o‘rnatib bo‘lmaydi. Safari yoki Chrome’da
                oching.
              </p>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-white underline underline-offset-2"
              >
                Brauzerda ochish
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : (
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-white/75">
              <li>
                Pastdagi <strong>Share</strong> (↗) tugmasini bosing
              </li>
              <li>
                Pastga aylantiring → <strong>Add to Home Screen</strong> /{" "}
                <strong>«На экран Домой»</strong>
              </li>
              <li>
                <strong>Add</strong> / Qoʻshish
              </li>
            </ol>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
