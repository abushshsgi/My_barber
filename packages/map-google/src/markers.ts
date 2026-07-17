function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type PricePillMotion = "enter" | "exit" | "none";

/** Airbnb-style price pill for salon discovery map. */
export function buildPricePillHtml(
  active: boolean,
  priceLabel: string,
  hovered = false,
  motion: PricePillMotion = "none",
): string {
  const text = escapeHtmlAttr(priceLabel);
  const bg = active ? "#141414" : hovered ? "#ffffff" : "#faf8f5";
  const color = active ? "#faf8f5" : "#141414";
  const border = active ? "2px solid #141414" : hovered ? "2px solid #141414" : "1px solid rgba(20,20,20,0.12)";
  const shadow = active || hovered ? "0 4px 14px rgba(0,0,0,0.28)" : "0 2px 8px rgba(0,0,0,0.14)";
  const scale = active ? 1.1 : hovered ? 1.06 : 1;
  const motionClass =
    motion === "enter" ? "map-marker-pill-enter" : motion === "exit" ? "map-marker-pill-exit" : "";
  const scaleStyle = motion === "none" ? `transform: scale(${scale});` : "";

  return `<div data-map-pill style="transform: translate(-50%, -50%); cursor: pointer;">
    <div class="${motionClass}" style="
      padding: 8px 14px; border-radius: 9999px; background: ${bg}; color: ${color};
      border: ${border}; box-shadow: ${shadow};
      font-size: 14px; font-weight: 800; line-height: 1.1; white-space: nowrap;
      letter-spacing: -0.01em;
      ${scaleStyle}${scaleStyle ? " " : ""}transition: transform 0.15s ease, background 0.15s ease;
      font-family: system-ui, -apple-system, sans-serif;
    ">${text}</div>
  </div>`;
}

function uniqueImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/** Marker bosilganda ochiladigan salon kartochkasi. */
export function buildSalonPreviewHtml(options: {
  coverUrl?: string;
  imageUrls?: string[];
  name: string;
  address?: string;
  rating?: number;
  ctaLabel: string;
}): string {
  const safeName = escapeHtmlAttr(options.name);
  const safeAddress = escapeHtmlAttr(options.address?.trim() || "");
  const safeCta = escapeHtmlAttr(options.ctaLabel);
  const rating =
    typeof options.rating === "number" && Number.isFinite(options.rating) && options.rating > 0
      ? options.rating
      : null;

  const images = uniqueImageUrls([
    ...(options.imageUrls ?? []),
    options.coverUrl?.trim() || "",
  ]);
  const hasCarousel = images.length > 1;
  const firstSrc = images[0] ? escapeHtmlAttr(images[0]) : "";
  const imagesJson = escapeHtmlAttr(JSON.stringify(images));

  const imageBlock = firstSrc
    ? `<img data-map-preview-img src="${firstSrc}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;transition:opacity 0.25s ease;" loading="lazy" />`
    : `<div style="width:100%;height:100%;background:linear-gradient(145deg,#ececec,#d8d8d8);"></div>`;

  const carouselControls = hasCarousel
    ? `<button type="button" data-map-preview-prev aria-label="Oldingi" style="
          position:absolute;left:8px;top:50%;transform:translateY(-50%);
          width:28px;height:28px;border:none;border-radius:9999px;cursor:pointer;
          background:rgba(250,248,245,0.92);color:#141414;box-shadow:0 2px 8px rgba(0,0,0,0.18);
          display:grid;place-items:center;padding:0;font-size:16px;line-height:1;font-weight:700;
        ">‹</button>
        <button type="button" data-map-preview-next aria-label="Keyingi" style="
          position:absolute;right:8px;top:50%;transform:translateY(-50%);
          width:28px;height:28px;border:none;border-radius:9999px;cursor:pointer;
          background:rgba(250,248,245,0.92);color:#141414;box-shadow:0 2px 8px rgba(0,0,0,0.18);
          display:grid;place-items:center;padding:0;font-size:16px;line-height:1;font-weight:700;
        ">›</button>
        <div data-map-preview-dots style="
          position:absolute;left:0;right:0;bottom:8px;display:flex;justify-content:center;gap:5px;
        ">
          ${images
            .map(
              (_, i) =>
                `<span data-map-preview-dot="${i}" style="
                  width:${i === 0 ? "14px" : "6px"};height:6px;border-radius:9999px;
                  background:${i === 0 ? "#faf8f5" : "rgba(250,248,245,0.45)"};
                  box-shadow:0 1px 3px rgba(0,0,0,0.25);transition:width 0.2s ease,background 0.2s ease;
                "></span>`,
            )
            .join("")}
        </div>`
    : "";

  const ratingBlock =
    rating != null
      ? `<span style="
          display:inline-flex;align-items:center;gap:3px;margin-top:6px;
          font-size:12px;font-weight:800;color:#141414;line-height:1;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#141414" aria-hidden="true">
            <path d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.47L12 17.77l-5.8 3.05 1.11-6.47-4.7-4.58 6.49-.94L12 2.5z"/>
          </svg>
          ${rating.toFixed(1)}
        </span>`
      : "";

  return `<div data-map-preview data-map-preview-images="${imagesJson}" data-map-preview-index="0" style="
    transform:translate(-50%,calc(-100% - 22px));pointer-events:auto;
    font-family:system-ui,-apple-system,sans-serif;
  ">
    <div style="
      width:280px;border-radius:20px;overflow:hidden;background:#faf8f5;
      border:1px solid rgba(20,20,20,0.1);box-shadow:0 16px 44px rgba(0,0,0,0.28);
    ">
      <div style="position:relative;width:100%;aspect-ratio:16/11;background:#E8E8E8;overflow:hidden;">
        ${imageBlock}
        ${carouselControls}
        <button type="button" data-map-preview-close aria-label="Yopish" style="
          position:absolute;top:8px;right:8px;width:30px;height:30px;border:none;border-radius:9999px;
          background:rgba(20,20,20,0.55);color:#faf8f5;cursor:pointer;display:grid;place-items:center;
          backdrop-filter:blur(8px);padding:0;line-height:1;font-size:18px;font-weight:600;
        ">×</button>
      </div>
      <div style="padding:12px 14px 14px;">
        <div style="font-size:15px;font-weight:800;line-height:1.25;color:#141414;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${safeName}
        </div>
        ${ratingBlock}
        ${safeAddress ? `<div style="margin-top:5px;font-size:12px;line-height:1.35;color:rgba(20,20,20,0.55);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeAddress}</div>` : ""}
        <button type="button" data-map-preview-go style="
          margin-top:12px;width:100%;padding:11px 12px;border:none;border-radius:12px;
          background:#141414;color:#faf8f5;font-size:13px;font-weight:800;line-height:1;
          cursor:pointer;font-family:inherit;
        ">${safeCta}</button>
      </div>
    </div>
    <div style="
      width:12px;height:12px;background:#faf8f5;border-right:1px solid rgba(20,20,20,0.08);
      border-bottom:1px solid rgba(20,20,20,0.08);transform:rotate(45deg);
      margin:-7px auto 0;box-shadow:2px 2px 4px rgba(0,0,0,0.06);
    "></div>
  </div>`;
}

export function buildUserDotHtml(): string {
  return `<span style="
    display:block;width:14px;height:14px;border-radius:9999px;
    background:#141414;border:3px solid #faf8f5;
    box-shadow:0 0 0 8px rgba(20,20,20,0.12);
    transform:translate(-50%,-50%);
  "></span>`;
}

export function buildAdminPinHtml(color: string, symbolPath: string): string {
  return `<div style="
    width:32px;height:32px;border-radius:50%;
    background:${color};color:#F7F6F3;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 6px rgba(0,0,0,0.25);
    border:2px solid #F7F6F3;
    transform:translate(-50%,-50%);cursor:pointer;
  ">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="${symbolPath}" />
    </svg>
  </div>`;
}

export function buildPopupHtml(title: string, subtitle: string, meta?: string): string {
  const t = escapeHtmlAttr(title);
  const s = escapeHtmlAttr(subtitle);
  const m = meta ? escapeHtmlAttr(meta) : "";
  return `<div style="font-family:system-ui,sans-serif;min-width:160px;padding:4px 2px;">
    <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${t}</div>
    ${s ? `<div style="font-size:12px;color:#666;">${s}</div>` : ""}
    ${m ? `<div style="font-size:12px;margin-top:6px;">${m}</div>` : ""}
  </div>`;
}
