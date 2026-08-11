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

function shareStaticFallback(opts: {
  image: string | null;
  styleTitle: string;
  sharerName: string;
  tryHref: string;
}): string {
  const img = opts.image
    ? `<img src="${escapeHtml(opts.image)}" alt="${escapeHtml(opts.styleTitle)}" style="display:block;width:100%;height:100%;object-fit:cover;object-position:top" />`
    : "";
  return `<div id="morph-share-static" style="min-height:100dvh;background:#fff;color:#0a0a0a;font-family:system-ui,sans-serif">
  <div style="max-width:32rem;margin:0 auto;padding:max(1rem,env(safe-area-inset-top)) 1.25rem 0.5rem">
    <p style="display:inline-block;margin:0;padding:0.25rem 0.65rem;border:1px solid #e5e5e5;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#737373">Morf AI</p>
    <h1 style="margin:0.75rem 0 0;max-width:20rem;font-size:1.45rem;line-height:1.15">${escapeHtml(opts.sharerName)}ning yangi obrazi</h1>
    <p style="margin:0.4rem 0 0;max-width:22rem;font-size:13px;line-height:1.5;color:#737373">${escapeHtml(opts.styleTitle)} — haqiqiy AI natija. Endi o‘zingizda ham sinab ko‘ring.</p>
  </div>
  <div style="max-width:32rem;margin:0 auto;padding:0.75rem 1.25rem max(1.75rem,env(safe-area-inset-bottom))">
    <div style="position:relative;aspect-ratio:3/4;overflow:hidden;border-radius:1rem;background:#f5f5f5">${img}</div>
    <a href="${escapeHtml(opts.tryHref)}" style="display:flex;margin-top:0.75rem;min-height:2.75rem;align-items:center;justify-content:center;border-radius:1rem;background:#0a0a0a;color:#fff;font-size:13px;font-weight:700;text-decoration:none">O‘zimda sinab ko‘rish</a>
  </div>
</div>`;
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
    const withHead = await injectHeadTags(response, meta, links);
    if (!seo?.image) return withHead;
    const tryHref = seo.styleId
      ? `/explore/${encodeURIComponent(seo.styleId)}/try`
      : "/ai-style";
    return injectBodyStart(
      withHead,
      shareStaticFallback({
        image: seo.image,
        styleTitle: seo.styleTitle,
        sharerName: seo.sharerName,
        tryHref,
      }),
    );
  }

  const lookMatch = pathname.match(/^\/morf-ai\/look\/([^/]+)\/?$/);
  if (lookMatch) {
    const styleId = decodeURIComponent(lookMatch[1]!);
    const seo = await fetchMorphLookSeo(styleId);
    const { meta, links } = buildMorphLookHeadMeta(styleId, seo);
    const withHead = await injectHeadTags(response, meta, links);
    if (!seo?.image) return withHead;
    return injectBodyStart(
      withHead,
      shareStaticFallback({
        image: seo.image,
        styleTitle: seo.styleTitle,
        sharerName: "Do‘stingiz",
        tryHref: `/explore/${encodeURIComponent(styleId)}/try`,
      }),
    );
  }

  return response;
}

async function injectBodyStart(response: Response, inner: string): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  if (!/<body[^>]*>/i.test(html)) return response;
  const outHeaders = new Headers(response.headers);
  outHeaders.delete("content-length");
  return new Response(html.replace(/<body([^>]*)>/i, `<body$1>${inner}`), {
    status: response.status,
    statusText: response.statusText,
    headers: outHeaders,
  });
}
