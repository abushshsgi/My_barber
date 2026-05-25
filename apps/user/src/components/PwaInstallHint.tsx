"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "mybarber_pwa_hint_dismissed";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIos() || isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
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
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold">Ilovani o‘rnating</p>
          <p className="text-xs leading-relaxed text-white/75">
            Safari pastidagi <strong>Share</strong> tugmasini bosing, keyin{" "}
            <strong>Add to Home Screen</strong> ni tanlang.
          </p>
          <p className="text-xs leading-relaxed text-white/55">
            Установите приложение: Share → «На экран Домой».
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Yopish"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
