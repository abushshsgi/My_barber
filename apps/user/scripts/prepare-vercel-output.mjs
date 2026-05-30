import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vercelOut = path.join(appDir, ".vercel", "output");
const configPath = path.join(vercelOut, "config.json");
const staticAssets = path.join(vercelOut, "static", "assets");

if (!existsSync(configPath)) {
  console.error("Missing .vercel/output/config.json — Nitro vercel build failed");
  process.exit(1);
}

if (!existsSync(path.join(vercelOut, "functions", "__server.func", "index.mjs"))) {
  console.error("Missing .vercel/output/functions/__server.func — server function not built");
  process.exit(1);
}

if (!existsSync(staticAssets) || readdirSync(staticAssets).length === 0) {
  console.error("Missing .vercel/output/static/assets — CSS/JS would 404 on deploy");
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
if (Array.isArray(config.routes)) {
  // Header-only /assets route must not block filesystem static serving.
  for (const route of config.routes) {
    if (route.headers && !route.dest && !route.handle) {
      route.continue = true;
    }
  }

  const fsIdx = config.routes.findIndex((r) => r.handle === "filesystem");
  if (fsIdx > 0) {
    const [filesystem] = config.routes.splice(fsIdx, 1);
    config.routes.unshift(filesystem);
  }
}

writeFileSync(configPath, JSON.stringify(config, null, 2));

console.log(`Vercel output OK: ${vercelOut}`);
console.log(`Static assets: ${readdirSync(staticAssets).length} files`);
