/**
 * Controlled A/B: buildA vs buildB on same host, same LH settings.
 * Usage (from apps/user):
 *   node scripts/run-controlled-ab-lighthouse.mjs --label=A --port=3010 --paths=/explore,/
 * Requires dist already built and server running on --port.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const label = getArg("label", "build");
const port = getArg("port", "3010");
const runs = Number(getArg("runs", "3"));
const routes = getArg("paths", "/explore").split(",").filter(Boolean);
const base = `http://127.0.0.1:${port}`;
const outDir = path.resolve(
  __dirname,
  `../../../docs/mysaloon-v3-qa/ab-lighthouse-${label}`,
);

fs.mkdirSync(outDir, { recursive: true });

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const manifest = {
  label,
  base,
  runs,
  capturedAt: new Date().toISOString(),
  routes: [],
};

for (const routePath of routes) {
  const id = routePath.replace(/^\//, "").replace(/\//g, "-") || "home";
  const metrics = [];
  for (let i = 1; i <= runs; i++) {
    const out = path.join(outDir, `${id}-run${i}.json`);
    execFileSync(
      "npx",
      [
        "lighthouse",
        `${base}${routePath}`,
        "--form-factor=mobile",
        "--throttling-method=simulate",
        "--output=json",
        `--output-path=${out}`,
        "--quiet",
        "--chrome-flags=--headless=new",
      ],
      { stdio: "inherit", shell: true },
    );
    const audit = JSON.parse(fs.readFileSync(out, "utf8"));
    metrics.push({
      perf: Math.round(audit.categories.performance.score * 100),
      lcp: audit.audits["largest-contentful-paint"].numericValue,
      fcp: audit.audits["first-contentful-paint"].numericValue,
      cls: audit.audits["cumulative-layout-shift"].numericValue,
      tbt: audit.audits["total-blocking-time"].numericValue,
      ttfb: audit.audits["server-response-time"]?.numericValue ?? null,
      seo: Math.round(audit.categories.seo.score * 100),
      a11y: Math.round(audit.categories.accessibility.score * 100),
    });
  }
  manifest.routes.push({
    path: routePath,
    id,
    median: {
      perf: median(metrics.map((m) => m.perf)),
      lcp_ms: median(metrics.map((m) => m.lcp)),
      fcp_ms: median(metrics.map((m) => m.fcp)),
      cls: median(metrics.map((m) => m.cls)),
      tbt_ms: median(metrics.map((m) => m.tbt)),
      ttfb_ms: median(metrics.map((m) => m.ttfb ?? 0)),
      seo: median(metrics.map((m) => m.seo)),
      a11y: median(metrics.map((m) => m.a11y)),
    },
    raw: metrics,
  });
}

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Wrote ${path.join(outDir, "manifest.json")}`);