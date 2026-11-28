/** Explore katalog LCP — statik WebP (Irland / mid-fade), React yuklanishidan oldin preload. */

import { parseLocaleFromPath } from "@/seo/url";

export const EXPLORE_LCP_HERO_SRC = "/hairstyles/men/personas/irland/mid-fade.webp";

export function pathUsesExploreLcpPreload(pathname: string): boolean {
  const { pathWithoutLocale } = parseLocaleFromPath(pathname);
  return pathWithoutLocale === "/explore";
}

/**
 * Head script: /explore da LCP rasmini darhol preload qiladi (grafik LCP, matn emas).
 */
export const EXPLORE_LCP_BOOT_SCRIPT = `(function(){
var raw=(location.pathname||"/").replace(/\\/+$/,"")||"/";
var p=raw.replace(/^\\/(ru|en)(\\/.*|$)/,function(_,l,s){return s||"/";})||"/";
if(p!=="/explore")return;
var href=${JSON.stringify(EXPLORE_LCP_HERO_SRC)};
if(document.querySelector('link[rel="preload"][href="'+href+'"]'))return;
var l=document.createElement("link");
l.rel="preload";l.as="image";l.type="image/webp";l.href=href;
l.setAttribute("fetchpriority","high");
(document.head||document.documentElement).appendChild(l);
})();`;