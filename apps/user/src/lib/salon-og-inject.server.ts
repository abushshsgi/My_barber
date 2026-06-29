import { buildSalonHeadMeta, fetchSalonSeoMeta } from "./salon-seo.server";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function metaTagsFromHead(meta: Array<Record<string, string>>): string {
  return meta
    .map((entry) => {
      if (entry.title) return `<title>${escapeHtml(entry.title)}</title>`;
      if (entry.name && entry.content) {
        return `<meta name="${escapeHtml(entry.name)}" content="${escapeHtml(entry.content)}" />`;
      }
      if (entry.property && entry.content) {
        return `<meta property="${escapeHtml(entry.property)}" content="${escapeHtml(entry.content)}" />`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n    ");
}

function stripGenericOgTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]+"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "");
}

/** Telegram/Facebook preview uchun salon OG teglarini HTML shell ga qo'shadi. */
export async function injectSalonOgIntoHtml(
  response: Response,
  pathname: string,
): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const match = pathname.match(/^\/salon\/([^/]+)\/?$/);
  if (!match) return response;

  const salonId = match[1];
  const seo = await fetchSalonSeoMeta(salonId);
  const { meta, links } = buildSalonHeadMeta(salonId, seo);
  const tags = [
    metaTagsFromHead(meta),
    ...(links ?? []).map(
      (link) => `<link rel="${escapeHtml(link.rel)}" href="${escapeHtml(link.href)}" />`,
    ),
  ]
    .filter(Boolean)
    .join("\n    ");

  if (!tags) return response;

  const html = stripGenericOgTags(await response.text());
  if (!html.includes("</head>")) return response;

  const outHeaders = new Headers(response.headers);
  outHeaders.delete("content-length");

  return new Response(html.replace("</head>", `    ${tags}\n  </head>`), {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
}
