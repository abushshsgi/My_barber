import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  }
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 12);
  }
  try {
    return execSync("git rev-parse --short HEAD", { cwd: appDir, encoding: "utf8" }).trim();
  } catch {
    return `local-${Date.now().toString(36)}`;
  }
}

const buildId = resolveBuildId();
const payload = { buildId, builtAt: new Date().toISOString() };

writeFileSync(path.join(appDir, ".build-id"), buildId);
writeFileSync(path.join(appDir, "version.json"), JSON.stringify(payload));

console.log(`App build ID: ${buildId}`);
