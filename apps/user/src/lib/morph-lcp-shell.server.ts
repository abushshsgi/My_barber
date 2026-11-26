import { MORPH_LCP_STATIC_ID, pathUsesMorphStaticLcp } from "@/lib/morph-lcp-static";
import { TRY_ON_HERO_PRELOAD, TRY_ON_HERO_SRCSET } from "@/lib/try-on-hero-assets";

const MORPH_LCP_SHELL_STYLE =
  "html:not([data-morph-lcp]) #" +
  MORPH_LCP_STATIC_ID +
  "{display:none!important}#" +
  MORPH_LCP_STATIC_ID +
  "{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;background:#f6f3f0}#" +
  MORPH_LCP_STATIC_ID +
  " img{position:absolute;inset:0;height:100%;width:100%;object-fit:cover;object-position:top}";

/** Try-on landing only — avoids competing with LCP on /, /explore, and other routes. */
export function injectMorphLcpShell(html: string, pathname: string): string {
  if (!pathUsesMorphStaticLcp(pathname)) return html;
  if (html.includes(`id="${MORPH_LCP_STATIC_ID}"`)) return html;

  const preload = `<link rel="preload" href="${TRY_ON_HERO_PRELOAD}" as="image" type="image/webp" fetchpriority="high" imagesrcset="${TRY_ON_HERO_SRCSET}" imagesizes="100vw" />`;
  const style = `<style>${MORPH_LCP_SHELL_STYLE}</style>`;
  const bodyBlock = `<div id="${MORPH_LCP_STATIC_ID}"><img src="${TRY_ON_HERO_PRELOAD}" srcset="${TRY_ON_HERO_SRCSET}" sizes="100vw" alt="" width="864" height="1152" decoding="async" fetchpriority="high" /></div>`;

  let out = html;
  if (out.includes("</head>")) {
    out = out.replace("</head>", `    ${preload}\n    ${style}\n  </head>`);
  }
  if (out.includes("<body")) {
    out = out.replace(/<body([^>]*)>/i, `<body$1>${bodyBlock}`);
  }
  return out;
}
