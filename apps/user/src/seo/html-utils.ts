import type { BuiltHead } from "./build-head";
import type { SeoLocale } from "./constants";

/** Align initial HTML `lang` with URL locale prefix (uz default, no cookie/session). */
export function applyDocumentLangToHtml(html: string, locale: SeoLocale): string {
  if (!/<html\b/i.test(html)) return html;
  return html.replace(/<html\b([^>]*)>/i, (_match, attrs: string) => {
    const withoutLang = attrs.replace(/\s+lang=(["'])[^"']*\1/i, "");
    return `<html lang="${locale}"${withoutLang}>`;
  });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function headToHtmlTags(head: BuiltHead): string {
  const meta = head.meta
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

  const links = head.links
    .map((link) => {
      const hreflang = link.hrefLang ? ` hreflang="${escapeHtml(link.hrefLang)}"` : "";
      return `<link rel="${escapeHtml(link.rel)}" href="${escapeHtml(link.href)}"${hreflang} />`;
    })
    .join("\n    ");

  return [meta, links].filter(Boolean).join("\n    ");
}

export function jsonLdScripts(blocks: unknown[]): string {
  return blocks
    .filter(Boolean)
    .map(
      (block) => `<script type="application/ld+json">${escapeHtml(JSON.stringify(block))}</script>`,
    )
    .join("\n    ");
}

export function stripReplaceableSeoTags(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<meta\s+name="robots"[^>]*>/gi, "")
    .replace(/<meta\s+name="keywords"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:[^"]+"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:[^"]+"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<link\s+rel="alternate"[^>]*>/gi, "");
}

export function injectBeforeHeadClose(html: string, tags: string): string {
  if (!tags || !html.includes("</head>")) return html;
  return html.replace("</head>", `    ${tags}\n  </head>`);
}

export function injectSeoPrerenderMain(html: string, innerHtml: string): string {
  if (!innerHtml) return html;
  const block = `<main id="seo-prerender" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0" aria-hidden="true">${innerHtml}</main>`;
  if (html.includes('<main id="seo-prerender"')) {
    return html.replace(/<main id="seo-prerender"[\s\S]*?<\/main>/i, block);
  }
  return html.replace(/<body([^>]*)>/i, `<body$1>${block}`);
}

export function buildPrerenderInner(
  h1: string,
  intro: string,
  links: Array<{ href: string; text: string }>,
  caption?: string,
): string {
  const nav = links
    .map((l) => `<a href="${escapeHtml(l.href)}">${escapeHtml(l.text)}</a>`)
    .join(" · ");
  const cap = caption ? `<figure><figcaption>${escapeHtml(caption)}</figcaption></figure>` : "";
  return `<h1>${escapeHtml(h1)}</h1><p>${escapeHtml(intro)}</p>${cap}<nav>${nav}</nav>`;
}
