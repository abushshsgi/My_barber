/**
 * Production Lighthouse batch — median of 3 runs per route.
 * Prerequisites: node dist/server/index.mjs on LIGHTHOUSE_BASE_URL (default :3002)
 *
 * Usage (apps/user):
 *   LIGHTHOUSE_BASE_URL=http://127.0.0.1:3002 node scripts/run-lighthouse-prod.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../docs/mysaloon-v3-qa/lighthouse");
const BASE = (process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:3002").replace(/\/$/, "");
const RUNS = Number(process.env.LIGHTHOUSE_RUNS ?? 3);

const ROUTES = [
  { id: "home", path: "/", formFactor: "mobile" },
  { id: "home-desktop", path: "/", formFactor: "desktop" },
  { id: "guides", path: "/guides", formFactor: "mobile" },
  { id: "article-qa", path: "/guides/qa-lighthouse-article", formFactor: "mobile" },
  { id: "explore", path: "/explore", formFactor: "mobile" },
  { id: "explore-desktop", path: "/explore", formFactor: "desktop" },
  { id: "detail-textured-crop", path: "/explore/men-textured-crop", formFactor: "mobile" },
  { id: "ai-style", path: "/ai-style", formFactor: "mobile" },
  { id: "morf-scanner-landing", path: "/morf-ai/ingredient-scanner", formFactor: "mobile" },
  { id: "scanner-auth", path: "/ai-style/care/ingredient", formFactor: "mobile", authNote: true },
];

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function pickMetric(audit, id) {
  const a = audit?.audits?.[id];
  if (!a) return null;
  return typeof a.numericValue === "number" ? a.numericValue : null;
}

function pickCategory(audit, id) {
  const c = audit?.categories?.[id];
  return typeof c?.score === "number" ? Math.round(c.score * 100) : null;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const summary = [];

for (const route of ROUTES) {
  const url = `${BASE}${route.path}`;
  const formFactor = route.formFactor === "desktop" ? "desktop" : "mobile";
  const perRun = [];

  for (let i = 0; i < RUNS; i += 1) {
    const outFile = path.join(OUT_DIR, `${route.id}-run${i + 1}.json`);
    const lhArgs =
      formFactor === "desktop"
        ? ["--preset=desktop"]
        : ["--form-factor=mobile", "--screenEmulation.mobile", "--throttling-method=simulate"];
    execFileSync(
      "npx",
      [
        "lighthouse",
        url,
        ...lhArgs,
        "--output=json",
        `--output-path=${outFile}`,
        "--quiet",
        "--chrome-flags=--headless=new",
      ],
      { stdio: "inherit", shell: true },
    );
    const raw = JSON.parse(fs.readFileSync(outFile, "utf8"));
    perRun.push({
      performance: pickCategory(raw, "performance"),
      accessibility: pickCategory(raw, "accessibility"),
      bestPractices: pickCategory(raw, "best-practices"),
      seo: pickCategory(raw, "seo"),
      lcpMs: pickMetric(raw, "largest-contentful-paint"),
      cls: pickMetric(raw, "cumulative-layout-shift"),
      fcpMs: pickMetric(raw, "first-contentful-paint"),
      siMs: pickMetric(raw, "speed-index"),
      tbtMs: pickMetric(raw, "total-blocking-time"),
    });
  }

  const med = {
    route: route.id,
    url,
    formFactor,
    runs: RUNS,
    performance: median(perRun.map((r) => r.performance ?? 0)),
    accessibility: median(perRun.map((r) => r.accessibility ?? 0)),
    bestPractices: median(perRun.map((r) => r.bestPractices ?? 0)),
    seo: median(perRun.map((r) => r.seo ?? 0)),
    lcpMs: median(perRun.map((r) => r.lcpMs ?? 0)),
    cls: median(perRun.map((r) => r.cls ?? 0)),
    fcpMs: median(perRun.map((r) => r.fcpMs ?? 0)),
    siMs: median(perRun.map((r) => r.siMs ?? 0)),
    tbtMs: median(perRun.map((r) => r.tbtMs ?? 0)),
  };
  summary.push(med);
  fs.writeFileSync(path.join(OUT_DIR, `${route.id}-median.json`), JSON.stringify(med, null, 2));
}

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  throttling:
    "Lighthouse default lab throttling (simulated mobile / desktop presets per route)",
  environment: "NODE_ENV=production Nitro server; API_UPSTREAM_URL=127.0.0.1:8001",
  runsPerRoute: RUNS,
  routes: summary,
};

fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));