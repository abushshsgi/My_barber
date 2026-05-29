import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(appDir, "dist");
const vercelOut = path.join(appDir, ".vercel", "output");

if (!existsSync(distDir)) {
  console.error("Missing dist/ — run vite build first");
  process.exit(1);
}

if (!existsSync(path.join(distDir, "config.json"))) {
  console.error("Missing dist/config.json — Nitro vercel preset build failed");
  process.exit(1);
}

if (!existsSync(path.join(distDir, "functions", "__server.func", "index.mjs"))) {
  console.error("Missing dist/functions/__server.func — Vercel server function not built");
  process.exit(1);
}

const clientAssets = path.join(distDir, "client", "assets");
if (!existsSync(clientAssets)) {
  console.error("Missing dist/client/assets — Vite client build failed");
  process.exit(1);
}

rmSync(vercelOut, { recursive: true, force: true });
mkdirSync(vercelOut, { recursive: true });
cpSync(distDir, vercelOut, { recursive: true });

// Vercel Build Output API serves public files from `static/` at the site root.
// Nitro's vercel preset keeps Vite output in `client/` — mirror it for the CDN.
const clientDir = path.join(vercelOut, "client");
const staticDir = path.join(vercelOut, "static");
if (existsSync(clientDir)) {
  cpSync(clientDir, staticDir, { recursive: true });
}

const staticAssets = path.join(staticDir, "assets");
if (!existsSync(staticAssets) || readdirSync(staticAssets).length === 0) {
  console.error("Missing .vercel/output/static/assets — deploy would 404 on CSS/JS");
  process.exit(1);
}

console.log(`Vercel Build Output API: ${vercelOut}`);
console.log(`Static files: ${staticAssets} (${readdirSync(staticAssets).length} assets)`);
