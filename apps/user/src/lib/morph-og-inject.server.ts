import {
  buildMorphLookHeadMeta,
  buildMorphShareHeadMeta,
  fetchMorphLookSeo,
  fetchMorphShareSeo,
} from "./morph-share-seo.server";

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

async function injectHeadTags(
  response: Response,
  meta: Array<Record<string, string>>,
  links: Array<{ rel: string; href: string }>,
): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const tags = [
    metaTagsFromHead(meta),
    ...links.map(
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

/** Telegram/Facebook preview — Morf AI share + look OG. */
export async function injectMorphOgIntoHtml(
  response: Response,
  pathname: string,
): Promise<Response> {
  const shareMatch = pathname.match(/^\/morf-ai\/share\/([^/]+)\/?$/);
  if (shareMatch) {
    const shareId = decodeURIComponent(shareMatch[1]!);
    const seo = await fetchMorphShareSeo(shareId);
    const { meta, links } = buildMorphShareHeadMeta(shareId, seo);
    return injectHeadTags(response, meta, links);
  }

  const lookMatch = pathname.match(/^\/morf-ai\/look\/([^/]+)\/?$/);
  if (lookMatch) {
    const styleId = decodeURIComponent(lookMatch[1]!);
    const seo = await fetchMorphLookSeo(styleId);
    const { meta, links } = buildMorphLookHeadMeta(styleId, seo);
    return injectHeadTags(response, meta, links);
  }

  return response;
}
