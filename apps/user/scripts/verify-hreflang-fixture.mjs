/**
 * Fetch initial HTML + hydrated check for qa-lighthouse-article hreflang cluster.
 * Usage: node scripts/verify-hreflang-fixture.mjs http://127.0.0.1:3002
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = (process.argv[2] ?? process.env.LIGHTHOUSE_BASE_URL ?? "http://127.0.0.1:3002").replace(
  /\/$/,
  "",
);
const slug = "qa-lighthouse-article";
const url = `${base}/guides/${slug}`;

function parseHreflang(html) {
  const re = /<link[^>]+rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*>/gi;
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push(m[1].toLowerCase());
  }
  return out;
}

function parseCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

function parseRobots(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

const res = await fetch(url, { headers: { Accept: "text/html" } });
const serverHtml = await res.text();
const serverHreflang = parseHreflang(serverHtml);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle" });
const domHreflang = await page.$$eval('link[rel="alternate"][hreflang]', (nodes) =>
  nodes.map((n) => (n.getAttribute("hreflang") ?? "").toLowerCase()),
);
const canonicalDom = await page.$eval('link[rel="canonical"]', (n) => n.getAttribute("href")).catch(() => null);
await browser.close();

const eligible = ["uz", "ru", "en", "x-default"];
const serverUnique = [...new Set(serverHreflang)];
const domUnique = [...new Set(domHreflang)];

const report = {
  url,
  httpStatus: res.status,
  serverHtml: {
    canonical: parseCanonical(serverHtml),
    robots: parseRobots(serverHtml),
    hreflang: serverHreflang,
    uniqueCount: serverUnique.length,
    onePerLocale:
      eligible.every((loc) => serverHreflang.filter((h) => h === loc).length === 1) &&
      serverHreflang.filter((h) => h === "x-default").length === 1,
  },
  hydratedDom: {
    canonical: canonicalDom,
    hreflang: domHreflang,
    uniqueCount: domUnique.length,
    duplicates: domHreflang.length !== domUnique.length,
  },
  draftProtection: {
    previewNoindex: parseRobots(serverHtml)?.includes("noindex") === true,
  },
  sitemap: {
    note: "Check /sitemap-blog.xml includes published fixture only when seeded",
  },
};

const outPath = path.resolve(__dirname, "../../../docs/mysaloon-v3-qa/seo/hreflang-fixture-report.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));