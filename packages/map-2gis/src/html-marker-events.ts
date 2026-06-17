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
