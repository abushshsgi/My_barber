import { copyFileSync, cpSync, existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(appDir, "dist");
const devIndexHtml = path.join(appDir, "index.html");

if (existsSync(devIndexHtml)) {
  console.error(
    "apps/user/index.html must not exist — it breaks Vercel SSR (white screen / main.tsx MIME error).",
  );
  process.exit(1);
}
const vercelOut = path.join(appDir, ".vercel", "output");
const configPath = path.join(distDir, "config.json");
const staticAssets = path.join(distDir, "static", "assets");

if (!existsSync(configPath)) {
  console.error("Missing dist/config.json — Nitro vercel build failed");
  process.exit(1);
}

if (!existsSync(path.join(distDir, "functions", "__server.func", "index.mjs"))) {
  console.error("Missing dist/functions/__server.func — server function not built");
  process.exit(1);
}

if (!existsSync(staticAssets) || readdirSync(staticAssets).length === 0) {
  console.error("Missing dist/static/assets — CSS/JS would 404 on deploy");
  process.exit(1);
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
const NO_STORE_HEADERS = {
  "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
  pragma: "no-cache",
  expires: "0",
};

if (Array.isArray(config.routes)) {
  // Nitro: text/plain asset 404 (continue) brauzerda MIME xatosini keltiradi.
  config.routes = config.routes.filter(
    (route) =>
      !(
        route.src === "/assets/(.*)" &&
        route.status === 404 &&
        String(route.headers?.["content-type"] || "").includes("text/plain")
      ),
  );

  for (const route of config.routes) {
    if (route.headers && !route.dest && !route.handle && route.status !== 404) {
      route.continue = true;
    }
  }

  config.routes = config.routes.filter(
    (route) =>
      !(
        (route.src === "/version.json" || route.src === "/((?!assets/).*)") &&
        route.continue &&
        route.headers?.["cache-control"]?.includes("no-store")
      ),
  );
  config.routes = config.routes.filter(
    (route) => !(route.src === "/assets/(.*)" && route.status === 404),
  );

  config.routes.unshift(
    { src: "/version.json", headers: NO_STORE_HEADERS, continue: true },
    { src: "/((?!assets/).*)", headers: NO_STORE_HEADERS, continue: true },
  );

  const fsIdx = config.routes.findIndex((r) => r.handle === "filesystem");
  if (fsIdx > 2) {
    const [filesystem] = config.routes.splice(fsIdx, 1);
    config.routes.splice(2, 0, filesystem);
  }

  const fsAt = config.routes.findIndex((r) => r.handle === "filesystem");
  if (fsAt >= 0) {
    config.routes.splice(fsAt + 1, 0, {
      src: "/assets/(.*)",
      status: 404,
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
        pragma: "no-cache",
      },
    });
  }
}

writeFileSync(configPath, JSON.stringify(config, null, 2));

const versionSrc = path.join(appDir, "version.json");
const versionDest = path.join(distDir, "static", "version.json");
if (existsSync(versionSrc)) {
  copyFileSync(versionSrc, versionDest);
  console.log("version.json copied to static/");
}

// Vercel Build Output API: faqat .vercel/output ishlatiladi.
// Dashboard Output Directory bo'sh bo'lishi kerak (dist EMAS).
rmSync(vercelOut, { recursive: true, force: true });
cpSync(distDir, vercelOut, { recursive: true });

console.log(`Build output: ${distDir}`);
console.log(`Vercel prebuilt: ${vercelOut}`);
console.log(`Static assets: ${readdirSync(staticAssets).length} files`);
