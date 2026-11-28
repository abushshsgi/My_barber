/**
 * Dev-only Explore critical path marks (no production overhead).
 */
const ENABLED =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  window.location.pathname.replace(/\/$/, "").endsWith("/explore");

function mark(name: string) {
  if (!ENABLED) return;
  try {
    performance.mark(`mysaloon:${name}`);
  } catch {
    /* noop */
  }
}

export const explorePerfMarks = {
  routerReady: () => mark("router-ready"),
  shellMounted: () => mark("shell-mounted"),
  i18nReady: () => mark("i18n-ready"),
  exploreRouteRender: () => mark("explore-route-render"),
  heroInDom: () => mark("explore-hero-dom"),
};

export function logExplorePerfMeasures(): void {
  if (!ENABLED) return;
  const pairs: [string, string][] = [
    ["navigation", "mysaloon:router-ready"],
    ["mysaloon:router-ready", "mysaloon:shell-mounted"],
    ["mysaloon:shell-mounted", "mysaloon:explore-route-render"],
    ["mysaloon:explore-route-render", "mysaloon:explore-hero-dom"],
  ];
  for (const [start, end] of pairs) {
    try {
      performance.measure(`mysaloon:${start}->${end}`, start, end);
    } catch {
      /* marks may be missing */
    }
  }
  const measures = performance.getEntriesByType("measure").filter((m) => m.name.startsWith("mysaloon:"));
  if (measures.length) {
    console.info("[explore-perf]", Object.fromEntries(measures.map((m) => [m.name, Math.round(m.duration)])));
  }
}