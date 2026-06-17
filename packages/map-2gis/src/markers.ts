function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Airbnb-style price pill for salon discovery map. */
export function buildPricePillHtml(active: boolean, priceLabel: string): string {
  const text = escapeHtmlAttr(priceLabel);
  const bg = active ? "#141414" : "#faf8f5";
  const color = active ? "#faf8f5" : "#141414";
  const border = active ? "2px solid #141414" : "1px solid rgba(20,20,20,0.12)";
  const shadow = active ? "0 4px 14px rgba(0,0,0,0.28)" : "0 2px 8px rgba(0,0,0,0.14)";
  const scale = active ? 1.08 : 1;

  return `<div style="transform:translate(-50%,-50%);cursor:pointer;">
    <div style="
      padding:6px 11px;border-radius:9999px;background:${bg};color:${color};
      border:${border};box-shadow:${shadow};
      font-size:12px;font-weight:800;line-height:1;white-space:nowrap;
      transform:scale(${scale});transition:transform 0.15s ease;
      font-family:system-ui,-apple-system,sans-serif;
    ">${text}</div>
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
