import type { HtmlOverlay } from "./html-overlay";

/** Attach click via DOM on overlay content. */
export function bindHtmlMarkerClick(marker: HtmlOverlay, onClick: () => void): void {
  const root = marker.getContent();
  root.style.pointerEvents = "auto";
  root.style.cursor = "pointer";
  const handler = (event: Event) => {
    event.stopPropagation();
    onClick();
  };
  root.onclick = handler as unknown as GlobalEventHandlers["onclick"];
}

export function bindHtmlMarkerHover(
  marker: HtmlOverlay,
  onEnter: () => void,
  onLeave: () => void,
): void {
  const root = marker.getContent();
  root.style.pointerEvents = "auto";
  root.onmouseenter = ((event: Event) => {
    event.stopPropagation();
    onEnter();
  }) as unknown as GlobalEventHandlers["onmouseenter"];
  root.onmouseleave = ((event: Event) => {
    event.stopPropagation();
    onLeave();
  }) as unknown as GlobalEventHandlers["onmouseleave"];
}

function parsePreviewImages(root: HTMLElement): string[] {
  const raw = root.getAttribute("data-map-preview-images") || "[]";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  } catch {
    return [];
  }
}

function setPreviewSlide(root: HTMLElement, index: number) {
  const images = parsePreviewImages(root);
  if (images.length === 0) return;
  const next = ((index % images.length) + images.length) % images.length;
  root.setAttribute("data-map-preview-index", String(next));

  const img = root.querySelector<HTMLImageElement>("[data-map-preview-img]");
  if (img) {
    img.style.opacity = "0.35";
    window.setTimeout(() => {
      img.src = images[next]!;
      img.style.opacity = "1";
    }, 80);
  }

  root.querySelectorAll<HTMLElement>("[data-map-preview-dot]").forEach((dot) => {
    const i = Number(dot.getAttribute("data-map-preview-dot"));
    const active = i === next;
    dot.style.width = active ? "14px" : "6px";
    dot.style.background = active ? "#faf8f5" : "rgba(250,248,245,0.45)";
  });
}

export function bindSalonPreviewInteractions(
  marker: HtmlOverlay,
  options: { onNavigate: () => void; onClose: () => void },
): void {
  const root = marker.getContent();
  root.style.pointerEvents = "auto";

  root.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  root.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  root.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  const go = root.querySelector("[data-map-preview-go]");
  go?.addEventListener("click", (event) => {
    event.stopPropagation();
    options.onNavigate();
  });

  const close = root.querySelector("[data-map-preview-close]");
  close?.addEventListener("click", (event) => {
    event.stopPropagation();
    options.onClose();
  });

  const prev = root.querySelector("[data-map-preview-prev]");
  const next = root.querySelector("[data-map-preview-next]");
  prev?.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = Number(root.getAttribute("data-map-preview-index") || "0");
    setPreviewSlide(root, current - 1);
  });
  next?.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = Number(root.getAttribute("data-map-preview-index") || "0");
    setPreviewSlide(root, current + 1);
  });
}

/** @deprecated use bindSalonPreviewInteractions */
export function bindSalonPreviewNavigate(marker: HtmlOverlay, onNavigate: () => void): void {
  bindSalonPreviewInteractions(marker, { onNavigate, onClose: () => undefined });
}
