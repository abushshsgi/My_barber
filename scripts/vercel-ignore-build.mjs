#!/usr/bin/env node
/**
 * Vercel Ignored Build Step (monorepo).
 * Exit 0  → build SKIP
 * Exit 1  → build CONTINUE
 *
 * Usage (Root Directory = apps/<app>):
 *   node ../../scripts/vercel-ignore-build.mjs admin
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
