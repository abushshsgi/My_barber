/**
 * Production client chunk sizes (raw + gzip) for performance reports.
 * Run after `npm run build` in apps/user.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "../dist/client/assets");

function gzipSize(buf) {
  return zlib.gzipSync(buf).length;
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${Math.round(bytes / 1024)} kB`;
}

if (!fs.existsSync(ASSETS)) {
  console.error("Missing", ASSETS, "— run npm run build first");
  process.exit(1);
}

const files = fs
  .readdirSync(ASSETS)
  .filter((f) => /\.(js|css)$/.test(f))
  .map((name) => {
    const buf = fs.readFileSync(path.join(ASSETS, name));
    return {
      name,
      kind: name.endsWith(".css") ? "css" : "js",
      raw: buf.length,
      gzip: gzipSize(buf),
    };
  })
  .sort((a, b) => b.raw - a.raw);

const js = files.filter((f) => f.kind === "js");
const css = files.filter((f) => f.kind === "css");
const entry =
  js.find((f) => /^index-/.test(f.name)) ??
  js.find((f) => f.name.includes("index")) ??
  js[0];

const initialJs = js.filter(
  (f) =>
  /^(index|vendor-router|vendor-query|vendor-i18n|vendor-radix)-/.test(f.name) ||
    f.name.startsWith("styles"),
);
const initialCss = css.filter((f) => f.name.includes("styles") || f.name.startsWith("index"));

const report = {
  generatedAt: new Date().toISOString(),
  assetDir: ASSETS,
  entry: entry
    ? { file: entry.name, raw: entry.raw, gzip: entry.gzip, rawLabel: fmt(entry.raw), gzipLabel: fmt(entry.gzip) }
    : null,
  initialJsBytes: initialJs.reduce((n, f) => n + f.raw, 0),
  initialJsGzip: initialJs.reduce((n, f) => n + f.gzip, 0),
  initialCssBytes: initialCss.reduce((n, f) => n + f.raw, 0),
  initialCssGzip: initialCss.reduce((n, f) => n + f.gzip, 0),
  largestJs: js.slice(0, 12).map((f) => ({
    file: f.name,
    raw: f.raw,
    gzip: f.gzip,
    rawLabel: fmt(f.raw),
    gzipLabel: fmt(f.gzip),
  })),
  vendorChunks: js
    .filter((f) => f.name.startsWith("vendor-"))
    .map((f) => ({ file: f.name, gzip: f.gzip, gzipLabel: fmt(f.gzip) })),
  exploreRouteChunks: js
    .filter((f) => /explore/i.test(f.name))
    .map((f) => ({ file: f.name, gzip: f.gzip, gzipLabel: fmt(f.gzip) })),
  totalJsRaw: js.reduce((n, f) => n + f.raw, 0),
  totalCssRaw: css.reduce((n, f) => n + f.raw, 0),
};

const out = path.resolve(__dirname, "../../../docs/mysaloon-v3-qa/bundle-sizes.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));