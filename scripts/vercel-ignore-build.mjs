#!/usr/bin/env node
/**
 * Vercel Ignored Build Step (monorepo).
 * Exit 0  → build SKIP
 * Exit 1  → build CONTINUE
 *
 * Usage (Root Directory = apps/<app>):
 *   node ../../scripts/vercel-ignore-build.mjs admin
 *
 * Also skips stale commits: when several pushes queue, only the tip of the
 * branch should build — older queued SHAs exit 0 so Vercel catches up once.
 */
import { execSync } from "node:child_process";

const app = process.argv[2];
if (!app) {
  console.log("Missing app name — building");
  process.exit(1);
}

const PATHS = {
  admin: ["apps/admin/", "packages/"],
  user: ["apps/user/", "packages/"],
  barber: ["apps/barber/", "packages/"],
};

const watch = PATHS[app];
if (!watch) {
  console.log(`Unknown app "${app}" — building`);
  process.exit(1);
}

const prev = process.env.VERCEL_GIT_PREVIOUS_SHA;
const curr = process.env.VERCEL_GIT_COMMIT_SHA || "HEAD";
const branch = process.env.VERCEL_GIT_COMMIT_REF || "";

/** Skip queued deployments that are no longer the tip of the pushed branch. */
if (branch && curr && curr !== "HEAD") {
  try {
    const tip = execSync(`git rev-parse origin/${branch}`, {
      encoding: "utf8",
    }).trim();
    if (tip && tip !== curr) {
      console.log(
        `Stale commit ${curr.slice(0, 7)} (tip is ${tip.slice(0, 7)}) — skipping`,
      );
      process.exit(0);
    }
  } catch {
    try {
      const tip = execSync(`git rev-parse ${branch}`, { encoding: "utf8" }).trim();
      if (tip && tip !== curr) {
        console.log(
          `Stale commit ${curr.slice(0, 7)} (tip is ${tip.slice(0, 7)}) — skipping`,
        );
        process.exit(0);
      }
    } catch {
      /* tip lookup failed — continue with path check */
    }
  }
}

if (!prev) {
  console.log("No previous SHA — building");
  process.exit(1);
}

try {
  const diff = execSync(`git diff --name-only ${prev} ${curr}`, {
    encoding: "utf8",
  }).trim();
  const files = diff ? diff.split("\n") : [];
  const hit = files.some((f) => watch.some((p) => f === p || f.startsWith(p)));
  if (hit) {
    console.log(`Changes in ${app} paths — building`);
    process.exit(1);
  }
  console.log(`No ${app}-relevant changes — skipping (${files.length} files touched)`);
  process.exit(0);
} catch (err) {
  console.log("Diff failed — building:", err instanceof Error ? err.message : err);
  process.exit(1);
}
