import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, CalendarPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getStoryBySalonId, getStoryIndex, salonStories } from "@/lib/stories-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stories/$salonId")({
  head: () => ({
    meta: [{ title: "Story — mysaloon.uz" }],
  }),
  component: StoryViewerPage,
});

function StoryViewerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { salonId } = Route.useParams();
  const story = getStoryBySalonId(salonId);
  const storyIndex = getStoryIndex(salonId);

  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startedRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const slide = story?.slides[slideIdx];
  const duration = slide?.durationMs ?? 5000;

  const goNext = useCallback(() => {
    if (!story) return;
    if (slideIdx < story.slides.length - 1) {
      setSlideIdx((i) => i + 1);
      setProgress(0);
      elapsedRef.current = 0;
      return;
    }
    const nextStory = salonStories[storyIndex + 1];
    if (nextStory) {
      void navigate({ to: "/stories/$salonId", params: { salonId: nextStory.salonId }, replace: true });
      setSlideIdx(0);
      setProgress(0);
      elapsedRef.current = 0;
      return;
    }
    void navigate({ to: "/stories" });
  }, [story, slideIdx, storyIndex, navigate]);

  const goPrev = useCallback(() => {
    if (!story) return;
    if (slideIdx > 0) {
      setSlideIdx((i) => i - 1);
      setProgress(0);
      elapsedRef.current = 0;
      return;
    }
    const prevStory = salonStories[storyIndex - 1];
    if (prevStory) {
      void navigate({
        to: "/stories/$salonId",
        params: { salonId: prevStory.salonId },
        replace: true,
      });
      setSlideIdx(Math.max(prevStory.slides.length - 1, 0));
      setProgress(0);
      elapsedRef.current = 0;
    }
  }, [story, slideIdx, storyIndex, navigate]);

  useEffect(() => {
    setSlideIdx(0);
    setProgress(0);
    elapsedRef.current = 0;
  }, [salonId]);

  useEffect(() => {
    if (!slide || paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startedRef.current = performance.now();
    const tick = (now: number) => {
      const start = startedRef.current ?? now;
      const elapsed = elapsedRef.current + (now - start);
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [slide, paused, duration, goNext]);

  const holdStart = () => {
    if (startedRef.current) {
      elapsedRef.current += performance.now() - startedRef.current;
    }
    setPaused(true);
  };

  const holdEnd = () => {
    startedRef.current = performance.now();
    setPaused(false);
  };

  const segments = useMemo(() => story?.slides ?? [], [story]);

  if (!story || !slide) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-foreground px-6 text-background">
        <div className="text-center">
          <p className="text-sm font-bold">{t("storiesPage.notFound")}</p>
          <Link to="/stories" className="mt-4 inline-block text-sm font-bold underline">
            {t("storiesPage.backToHub")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-foreground text-background"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="absolute inset-0"
          style={{
            background: `linear-gradient(165deg, oklch(0.22 0.02 ${slide.hue}) 0%, oklch(0.12 0.01 ${slide.hue}) 45%, oklch(0.08 0 0) 100%)`,
          }}
        />
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, oklch(0.95 0.02 90 / 0.15), transparent 45%), radial-gradient(circle at 80% 70%, oklch(0.95 0.02 90 / 0.08), transparent 40%)",
        }}
      />

      <header className="relative z-20 px-4 pt-3">
        <div className="flex gap-1">
          {segments.map((seg, i) => (
            <div key={seg.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-background/25">
              <div
                className="h-full rounded-full bg-background transition-none"
                style={{
                  width:
                    i < slideIdx ? "100%" : i === slideIdx ? `${progress * 100}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-bold text-background"
              style={{
                background: `linear-gradient(135deg, oklch(0.85 0.04 ${slide.hue}), oklch(0.65 0.05 ${slide.hue + 30}))`,
              }}
            >
              {story.salonName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{story.salonName}</p>
              <p className="text-[10px] font-medium text-background/60">
                {slideIdx + 1}/{segments.length}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/stories" })}
            className="grid h-9 w-9 place-items-center rounded-full bg-background/15 active:scale-95"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-8 pt-16">
        <motion.div
          key={`copy-${slide.id}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-background/55">
            mysaloon story
          </p>
          <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight">{slide.headline}</h1>
          <p className="mt-3 max-w-[320px] text-[15px] leading-relaxed text-background/75">{slide.body}</p>
        </motion.div>

        <div className="mt-6 flex gap-2">
          {slide.cta && (
            <Link
              to="/salon/$id"
              params={{ id: story.salonId }}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-background py-3.5 text-sm font-bold text-foreground active:scale-[0.98]"
            >
              <CalendarPlus className="h-4 w-4" />
              {slide.cta}
            </Link>
          )}
          <Link
            to="/booking/$salonId"
            params={{ salonId: story.salonId }}
            className={cn(
              "inline-flex items-center justify-center rounded-2xl border border-background/30 px-5 py-3.5 text-sm font-bold active:scale-[0.98]",
              !slide.cta && "flex-1",
            )}
          >
            {t("storiesPage.bookNow")}
          </Link>
        </div>
      </div>

      <button
        type="button"
        aria-label="Previous"
        className="absolute inset-y-0 left-0 z-30 w-[28%]"
        onClick={goPrev}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerLeave={holdEnd}
      />
      <button
        type="button"
        aria-label="Next"
        className="absolute inset-y-0 right-0 z-30 w-[72%]"
        onClick={goNext}
        onPointerDown={holdStart}
        onPointerUp={holdEnd}
        onPointerLeave={holdEnd}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-28 z-20 flex justify-between px-2 opacity-0 sm:opacity-100">
        <ChevronLeft className="h-6 w-6 text-background/40" />
        <ChevronRight className="h-6 w-6 text-background/40" />
      </div>
    </div>
  );
}
