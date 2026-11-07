/** Chat kartasidan mavjud Explore va Try-on yo'llari. */

export function hairstyleExploreHref(styleId: string): string {
  return `/explore/${encodeURIComponent(styleId)}`;
}

export function hairstyleTryHref(styleId: string): string {
  return `/explore/${encodeURIComponent(styleId)}/try`;
}
