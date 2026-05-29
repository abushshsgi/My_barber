import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
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

rmSync(vercelOut, { recursive: true, force: true });
mkdirSync(vercelOut, { recursive: true });
cpSync(distDir, vercelOut, { recursive: true });

console.log(`Vercel Build Output API: ${vercelOut}`);
