import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolveBuildId() {
  let raw;
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    raw = process.env.VERCEL_GIT_COMMIT_SHA;
  } else if (process.env.GITHUB_SHA) {
    raw = process.env.GITHUB_SHA;
  } else {
    try {
      raw = execSync("git rev-parse --short HEAD", { cwd: appDir, encoding: "utf8" }).trim();
    } catch {
      return `local-${Date.now().toString(36)}`;
    }
  }
  return raw.slice(0, 7);
}

const buildId = resolveBuildId();
const payload = { buildId, builtAt: new Date().toISOString() };

writeFileSync(path.join(appDir, "public", "version.json"), JSON.stringify(payload));
writeFileSync(
  path.join(appDir, "src", "lib", "app-build-id.ts"),
  `/** Generated at build — do not edit */\nexport const APP_BUILD_ID = ${JSON.stringify(buildId)};\n`,
);

console.log(`Partner app build ID: ${buildId}`);
