import "./google-maps-types";

/** Custom HTML marker via OverlayView (price pills, previews, admin pins). */

export type HtmlOverlay = {
  getContent: () => HTMLElement;
  setContent: (html: string) => void;
  setCoordinates: (lat: number, lng: number) => void;
  setZIndex: (zIndex: number) => void;
  destroy: () => void;
};

/** Must be called after `loadGoogleMaps()` so `google.maps` exists. */
export function createHtmlOverlay(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  html: string,
  options?: { zIndex?: number },
): HtmlOverlay {
  class HtmlOverlayImpl extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private position: google.maps.LatLng;
    private html: string;
    private zIndex: number;

    constructor() {
      super();
      this.position = new google.maps.LatLng(position.lat, position.lng);
      this.html = html;
      this.zIndex = options?.zIndex ?? 10;
      this.setMap(map);
    }

    onAdd(): void {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";
      this.div.style.pointerEvents = "auto";
      this.div.innerHTML = this.html;
      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(this.div);
    }

    draw(): void {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
      this.div.style.zIndex = String(this.zIndex);
    }

    onRemove(): void {
      this.div?.remove();
      this.div = null;
    }

    getContent(): HTMLElement {
      if (!this.div) {
        const fallback = document.createElement("div");
        fallback.innerHTML = this.html;
        return (fallback.firstElementChild as HTMLElement) ?? fallback;
      }
      return (this.div.firstElementChild as HTMLElement) ?? this.div;
    }

    setContent(nextHtml: string): void {
      this.html = nextHtml;
      if (this.div) this.div.innerHTML = nextHtml;
    }

    setCoordinates(lat: number, lng: number): void {
      this.position = new google.maps.LatLng(lat, lng);
      this.draw();
    }

    setZIndex(zIndex: number): void {
      this.zIndex = zIndex;
      if (this.div) this.div.style.zIndex = String(zIndex);
    }

    destroy(): void {
      this.setMap(null);
    }
  }

  return new HtmlOverlayImpl();
}
