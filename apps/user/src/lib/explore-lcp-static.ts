/** Explore katalog LCP — statik WebP (Irland / mid-fade), React yuklanishidan oldin preload. */

export const EXPLORE_LCP_HERO_SRC = "/hairstyles/men/personas/irland/mid-fade.webp";

export function pathUsesExploreLcpPreload(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/explore";
}

/**
 * Head script: /explore da LCP rasmini darhol preload qiladi (grafik LCP, matn emas).
 */
export const EXPLORE_LCP_BOOT_SCRIPT = `(function(){
var p=(location.pathname||"/").replace(/\\/+$/,"")||"/";
if(p!=="/explore")return;
var href=${JSON.stringify(EXPLORE_LCP_HERO_SRC)};
if(document.querySelector('link[rel="preload"][href="'+href+'"]'))return;
var l=document.createElement("link");
l.rel="preload";l.as="image";l.type="image/webp";l.href=href;
l.setAttribute("fetchpriority","high");
(document.head||document.documentElement).appendChild(l);
})();`;