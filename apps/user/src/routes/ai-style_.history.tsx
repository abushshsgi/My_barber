import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ChevronLeft, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { refreshAiStyleHistoryCache } from "@/lib/api";
import {
  FACE_HISTORY_UPDATED_EVENT,
  getActiveUserId,
  type FaceProfileHistoryEntry,
} from "@/lib/face-profile";
export const Route = createFileRoute("/ai-style_/history")({
  head: () => ({
    meta: [
      { title: "Morf AI tarixi — mysaloon.uz" },
      {
        name: "description",
        content: "Oldingi Morf AI selfie tahlillari va rasmlar.",
      },
    ],
  }),
  component: AiStyleHistoryPage,
});

function AiStyleHistoryPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<FaceProfileHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = getActiveUserId();

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await refreshAiStyleHistoryCache();
      if (!cancelled) {
        setEntries(list);
        setLoading(false);
      }
    };
    void refresh();
    const onCacheUpdate = () => {
      void refresh();
    };
    window.addEventListener(FACE_HISTORY_UPDATED_EVENT, onCacheUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(FACE_HISTORY_UPDATED_EVENT, onCacheUpdate);
    };
  }, [userId]);

  return (
    <div className="w-full pb-6 pt-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/ai-style"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-surface"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
            {t("common.back", { defaultValue: "Orqaga" })}
          </Link>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {t("aiStylePage.title")}
            </p>
            <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {t("aiStylePage.historyPageTitle", { defaultValue: "Tahlil tarixi" })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("aiStylePage.historyPageSubtitle", {
                defaultValue: "Barcha oldingi selfie tahlillari — pastga skroll qiling",
              })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center">
            <p className="text-base font-semibold text-foreground">{t("aiStylePage.historyEmpty")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("aiStylePage.historyEmptyHint")}</p>
            <Link
              to="/ai-style"
              className="mt-6 inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background"
            >
              {t("aiStylePage.uploadTitle")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid max-h-[min(72dvh,820px)] grid-cols-2 gap-3 overflow-y-auto overscroll-contain pb-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
              >
                <div className="aspect-[3/4] overflow-hidden bg-surface">
                  <img
                    src={entry.photoDataUrl}
                    alt=""
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {formatHistoryDate(entry.scannedAt)}
                  </p>
                  {entry.faceShapeKey ? (
                    <p className="mt-0.5 truncate text-xs font-bold capitalize text-foreground">
                      {entry.faceShapeKey}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatHistoryDate(iso: string) {
  try {
    return format(parseISO(iso), "dd.MM.yyyy HH:mm");
  } catch {
    return iso;
  }
}
