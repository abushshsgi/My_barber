import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicVersion = path.join(appDir, "public", "version.json");
const rootVersion = path.join(appDir, "version.json");
const distClient = path.join(appDir, "dist", "client");
const distVersion = path.join(distClient, "version.json");

const src = existsSync(publicVersion) ? publicVersion : rootVersion;
if (!existsSync(src)) {
  const fallback = { buildId: `missing-${Date.now().toString(36)}`, builtAt: new Date().toISOString() };
  writeFileSync(publicVersion, JSON.stringify(fallback));
  console.warn("ensure-dist-version: created fallback public/version.json");
}

mkdirSync(distClient, { recursive: true });
const finalSrc = existsSync(publicVersion) ? publicVersion : rootVersion;
copyFileSync(finalSrc, distVersion);

const payload = JSON.parse(readFileSync(distVersion, "utf8"));
if (!payload.buildId) {
  throw new Error("dist/client/version.json missing buildId");
}
console.log(`ensure-dist-version: wrote dist/client/version.json (buildId=${payload.buildId})`);