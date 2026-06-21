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
      padding: 6px 11px; border-radius: 9999px; background: ${bg}; color: ${color};
      border: ${border}; box-shadow: ${shadow};
      font-size: 12px; font-weight: 800; line-height: 1; white-space: nowrap;
      ${scaleStyle}${scaleStyle ? " " : ""}transition: transform 0.15s ease, background 0.15s ease;
      font-family: system-ui, -apple-system, sans-serif;
    ">${text}</div>
  </div>`;
}

/** Marker bosilganda ochiladigan salon kartochkasi. */
export function buildSalonPreviewHtml(options: {
  coverUrl?: string;
  name: string;
  address?: string;
  ctaLabel: string;
}): string {
  const safeName = escapeHtmlAttr(options.name);
  const safeAddress = escapeHtmlAttr(options.address?.trim() || "");
  const safeCover = options.coverUrl?.trim() ? escapeHtmlAttr(options.coverUrl.trim()) : "";
  const safeCta = escapeHtmlAttr(options.ctaLabel);

  const imageBlock = safeCover
    ? `<img src="${safeCover}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy" />`
    : `<div style="width:100%;height:100%;background:linear-gradient(145deg,#ececec,#d8d8d8);"></div>`;

  return `<div data-map-preview style="
    transform:translate(-50%,calc(-100% - 20px));pointer-events:auto;
    font-family:system-ui,-apple-system,sans-serif;
  ">
    <div style="
      width:200px;border-radius:16px;overflow:hidden;background:#faf8f5;
      border:1px solid rgba(20,20,20,0.1);box-shadow:0 12px 36px rgba(0,0,0,0.24);
    ">
      <div style="width:100%;aspect-ratio:4/3;background:#E8E8E8;overflow:hidden;">
        ${imageBlock}
      </div>
      <div style="padding:10px 12px 12px;">
        <div style="font-size:14px;font-weight:800;line-height:1.25;color:#141414;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${safeName}
        </div>
        ${safeAddress ? `<div style="margin-top:4px;font-size:11px;line-height:1.35;color:rgba(20,20,20,0.55);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeAddress}</div>` : ""}
        <button type="button" data-map-preview-go style="
          margin-top:10px;width:100%;padding:9px 12px;border:none;border-radius:10px;
          background:#141414;color:#faf8f5;font-size:12px;font-weight:800;line-height:1;
          cursor:pointer;font-family:inherit;
        ">${safeCta}</button>
      </div>
    </div>
    <div style="
      width:10px;height:10px;background:#faf8f5;border-right:1px solid rgba(20,20,20,0.08);
      border-bottom:1px solid rgba(20,20,20,0.08);transform:rotate(45deg);
      margin:-6px auto 0;box-shadow:2px 2px 4px rgba(0,0,0,0.06);
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
