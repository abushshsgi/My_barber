import { hasMorphAiIntroSeen } from "@/lib/morph-ai-session";

export const MORPH_AI_INTRO_VIDEO_SRC = "/ai-style/morph-ai-intro.mp4";

let prefetchStarted = false;
let blobUrl: string | null = null;
let blobPromise: Promise<string> | null = null;
let warmVideo: HTMLVideoElement | null = null;

function createWarmVideo(src: string) {
  if (typeof document === "undefined") return null;
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.src = src;
  video.load();
  return video;
}

/** Fully buffered local URL when ready; otherwise the public path. */
export function getMorphAiIntroVideoSrc(): string {
  return blobUrl ?? MORPH_AI_INTRO_VIDEO_SRC;
}

/** Resolve a blob URL so playback can start without network wait. */
export function ensureMorphAiIntroBlob(): Promise<string> {
  if (blobUrl) return Promise.resolve(blobUrl);
  if (blobPromise) return blobPromise;

  blobPromise = fetch(MORPH_AI_INTRO_VIDEO_SRC, { credentials: "same-origin" })
    .then((res) => {
      if (!res.ok) throw new Error(`intro video ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      blobUrl = URL.createObjectURL(blob);
      warmVideo = createWarmVideo(blobUrl);
      return blobUrl;
    })
    .catch(() => {
      blobPromise = null;
      return MORPH_AI_INTRO_VIDEO_SRC;
    });

  return blobPromise;
}

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

  warmVideo = createWarmVideo(MORPH_AI_INTRO_VIDEO_SRC);
  void ensureMorphAiIntroBlob();
}
