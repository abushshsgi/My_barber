import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(appDir, "../salon-connect/dist");
const target = path.resolve(appDir, "dist");

if (!existsSync(source)) {
  console.error(`Build output not found: ${source}`);
  process.exit(1);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

cpSync(source, target, { recursive: true });

const required = ["config.json", "functions/__server.func/index.mjs", "client/assets"];
for (const rel of required) {
  if (!existsSync(path.join(target, rel))) {
    console.error(`Missing Vercel artifact: dist/${rel}`);
    process.exit(1);
  }
}

console.log(`Vercel output ready: ${target}`);
