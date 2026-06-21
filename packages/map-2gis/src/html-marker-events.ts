/// <reference path="../../../node_modules/@2gis/mapgl/global.d.ts" />

/** HtmlMarker has no Evented.on — attach click via DOM (2GIS docs). */
export function bindHtmlMarkerClick(marker: mapgl.HtmlMarker, onClick: () => void): void {
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
  marker: mapgl.HtmlMarker,
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

export function bindSalonPreviewNavigate(marker: mapgl.HtmlMarker, onNavigate: () => void): void {
  const root = marker.getContent();
  root.style.pointerEvents = "auto";
  const btn = root.querySelector("[data-map-preview-go]");
  btn?.addEventListener("click", (event) => {
    event.stopPropagation();
    onNavigate();
  });
}
