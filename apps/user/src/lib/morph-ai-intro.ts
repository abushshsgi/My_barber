import { hasMorphAiIntroSeen } from "@/lib/morph-ai-session";

export const MORPH_AI_INTRO_VIDEO_SRC = "/ai-style/morph-ai-intro.mp4";

let prefetchStarted = false;

/** Start downloading the Morph AI intro so it can play immediately on first visit. */
export function prefetchMorphAiIntroVideo() {
  if (prefetchStarted || typeof window === "undefined") return;
  if (hasMorphAiIntroSeen()) return;
  prefetchStarted = true;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "video";
  link.href = MORPH_AI_INTRO_VIDEO_SRC;
  link.type = "video/mp4";
  document.head.appendChild(link);

  // Warm HTTP cache so <video> can start without a cold fetch.
  void fetch(MORPH_AI_INTRO_VIDEO_SRC, { credentials: "same-origin", cache: "force-cache" }).catch(
    () => {
      /* noop */
    },
  );
}
