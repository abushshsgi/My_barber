import { EXPLORE_LCP_HERO_SRC, pathUsesExploreLcpPreload } from "@/lib/explore-lcp-static";

export const EXPLORE_LCP_STATIC_ID = "explore-lcp-static";

const EXPLORE_LCP_SHELL_STYLE =
  "html:not([data-explore-lcp]) #" +
  EXPLORE_LCP_STATIC_ID +
  "{display:none!important}#" +
  EXPLORE_LCP_STATIC_ID +
  "{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;background:#e8e8e8}#" +
  EXPLORE_LCP_STATIC_ID +
  " img{position:absolute;inset:0;height:100%;width:100%;object-fit:cover;object-position:top}";

/**
 * Explore katalog — React yuklanishidan oldin LCP uchun statik qahramon.
 * Morf try-on shell bilan bir xil gibrid SSR naqsh.
 */
export function injectExploreLcpShell(html: string, pathname: string): string {
  if (!pathUsesExploreLcpPreload(pathname)) return html;
  if (html.includes(`id="${EXPLORE_LCP_STATIC_ID}"`)) return html;

  const preload = `<link rel="preload" href="${EXPLORE_LCP_HERO_SRC}" as="image" type="image/webp" fetchpriority="high" />`;
  const style = `<style>${EXPLORE_LCP_SHELL_STYLE}</style>`;
  const bodyBlock = `<div id="${EXPLORE_LCP_STATIC_ID}"><img src="${EXPLORE_LCP_HERO_SRC}" alt="" width="768" height="1024" decoding="async" fetchpriority="high" /></div>`;

  let out = html;
  if (out.includes("</head>")) {
    out = out.replace("</head>", `    ${preload}\n    ${style}\n  </head>`);
  }
  if (out.includes("<body")) {
    out = out.replace(/<body([^>]*)>/i, `<body$1>${bodyBlock}`);
  }
  return out;
}