/** Static SSR LCP hero (try-on model) — only on Morf try-on landing. */

export const MORPH_LCP_STATIC_ID = "morph-lcp-static";

/** True only for the exact Try-on entry route (not /ai-style/care/*, chat, etc.). */
export function pathUsesMorphStaticLcp(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return p === "/ai-style";
}

/**
 * Inline head script: mark try-on landing for LCP; hide static hero everywhere else
 * (prevents “only model image” when JS fails on other routes).
 */
export const MORPH_LCP_BOOT_SCRIPT = `(function(){
var p=(location.pathname||"/").replace(/\\/+$/,"")||"/";
if(p==="/ai-style"){document.documentElement.setAttribute("data-morph-lcp","");}
else{document.documentElement.removeAttribute("data-morph-lcp");}
})();`;

export function removeMorphLcpStatic(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-morph-lcp");
  document.getElementById(MORPH_LCP_STATIC_ID)?.remove();
}