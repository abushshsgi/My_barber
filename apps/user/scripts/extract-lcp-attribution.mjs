/**
 * Summarize LCP, FCP, bootup-time, and LCP breakdown from Lighthouse JSON.
 * Usage: node scripts/extract-lcp-attribution.mjs path/to/explore-run1.json
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("Usage: node scripts/extract-lcp-attribution.mjs <lighthouse.json>");
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(file, "utf8"));
const a = raw.audits ?? {};

const pick = (id) => a[id]?.numericValue ?? null;

const bootItems = a["bootup-time"]?.details?.items ?? [];
const lcpInsight = a["lcp-breakdown-insight"]?.details?.items ?? [];
const lcpSubparts = lcpInsight.find((x) => x.type === "table")?.items ?? [];
const lcpNode = lcpInsight.find((x) => x.type === "node");

const subpartSum = lcpSubparts.reduce((n, row) => n + (row.duration ?? 0), 0);
const lcpTotal = pick("largest-contentful-paint");

const out = {
  file,
  lcp_ms: lcpTotal,
  fcp_ms: pick("first-contentful-paint"),
  ttfb_ms: pick("server-response-time"),
  tbt_ms: pick("total-blocking-time"),
  cls: pick("cumulative-layout-shift"),
  perf: raw.categories?.performance?.score != null ? Math.round(raw.categories.performance.score * 100) : null,
  lcp_subparts_ms: Object.fromEntries(lcpSubparts.map((r) => [r.subpart ?? r.label, r.duration])),
  lcp_subparts_sum_ms: subpartSum,
  lcp_unattributed_gap_ms: lcpTotal != null ? lcpTotal - subpartSum : null,
  lcp_element: lcpNode
    ? { selector: lcpNode.selector, snippet: lcpNode.snippet, nodeLabel: lcpNode.nodeLabel }
    : null,
  bootup_top5_ms: bootItems.slice(0, 5).map((row) => ({
    url: row.url,
    scripting: row.scripting,
    total: row.total,
  })),
};

console.log(JSON.stringify(out, null, 2));