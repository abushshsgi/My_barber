/**
 * Lighthouse on live production URLs — median of 3 runs per route.
 * Usage: node scripts/run-lighthouse-live-site.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "../../../docs/mysaloon-v3-qa/lighthouse-live-prod");
const BASE = (process.env.LIGHTHOUSE_BASE_URL ?? "https://mysaloon.uz").replace(/\/$/, "");
const RUNS = 3;

const ROUTES = [
  { id: "home", path: "/", formFactor: "mobile" },
  { id: "home-desktop", path: "/", formFactor: "desktop" },
  { id: "explore", path: "/explore", formFactor: "mobile" },
  { id: "explore-desktop", path: "/explore", formFactor: "desktop" },
  { id: "guides", path: "/guides", formFactor: "mobile" },
  { id: "guides-desktop", path: "/guides", formFactor: "desktop" },
  { id: "detail-textured-crop", path: "/explore/men-textured-crop", formFactor: "mobile" },
  { id: "detail-textured-crop-desktop", path: "/explore/men-textured-crop", formFactor: "desktop" },
  { id: "morf-scanner-landing", path: "/morf-ai/ingredient-scanner", formFactor: "mobile" },
  { id: "morf-scanner-landing-desktop", path: "/morf-ai/ingredient-scanner", formFactor: "desktop" },
];

function median(nums) {
  const sorted = [...nums].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!sorted.length) return null;
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
    const lhArgs = [
      url,
      "--output=json",
      `--output-path=${outFile}`,
      "--quiet",
      "--chrome-flags=--headless --no-sandbox",
      `--form-factor=${formFactor}`,
      "--only-categories=performance,accessibility,best-practices,seo",
    ];
    if (formFactor === "desktop") {
      lhArgs.push("--screenEmulation.disabled");
      lhArgs.push("--throttling.cpuSlowdownMultiplier=1");
    }
    console.log(`[lh] ${route.id} run ${i + 1}/${RUNS} ${url}`);
    execFileSync("npx", ["lighthouse", ...lhArgs], { stdio: "inherit", shell: true });
    const raw = JSON.parse(fs.readFileSync(outFile, "utf8"));
    perRun.push({
      perf: pickCategory(raw, "performance"),
      a11y: pickCategory(raw, "accessibility"),
      bp: pickCategory(raw, "best-practices"),
      seo: pickCategory(raw, "seo"),
      lcp: pickMetric(raw, "largest-contentful-paint"),
      fcp: pickMetric(raw, "first-contentful-paint"),
      cls: pickMetric(raw, "cumulative-layout-shift"),
      tbt: pickMetric(raw, "total-blocking-time"),
      ttfb: pickMetric(raw, "server-response-time"),
    });
  }

  const med = {
    id: route.id,
    url,
    formFactor,
    perf: median(perRun.map((r) => r.perf)),
    a11y: median(perRun.map((r) => r.a11y)),
    bp: median(perRun.map((r) => r.bp)),
    seo: median(perRun.map((r) => r.seo)),
    lcp_ms: median(perRun.map((r) => r.lcp)),
    fcp_ms: median(perRun.map((r) => r.fcp)),
    cls: median(perRun.map((r) => r.cls)),
    tbt_ms: median(perRun.map((r) => r.tbt)),
    ttfb_ms: median(perRun.map((r) => r.ttfb)),
  };
  summary.push(med);
  const medianFile = path.join(OUT_DIR, `${route.id}-median.json`);
  fs.writeFileSync(medianFile, JSON.stringify(med, null, 2));
}

fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify({ base: BASE, runs: RUNS, capturedAt: new Date().toISOString(), routes: summary }, null, 2));
console.log("Wrote", path.join(OUT_DIR, "manifest.json"));