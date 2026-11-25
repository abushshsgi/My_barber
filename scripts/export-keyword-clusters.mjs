import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "docs", "seo-keyword-clusters.csv");

// Minimal mirror of KEYWORD_CLUSTERS (run from built TS in CI if needed).
const rows = [
  ["entity_type", "entity_id", "locale", "primary_keyword", "secondary_keywords", "search_intent", "monthly_volume_note", "competition_note"],
  ["service", "morf-ai-try-on", "uz", "soch turmagi sinab ko'rish", "virtual try on; selfie soch", "transactional", "estimate: medium", "estimate: medium"],
  ["category", "mens-haircuts", "uz", "erkaklar soch turmaklari", "barber uslublari", "informational", "estimate: medium-high", "estimate: medium"],
  ["model", "men-textured-crop", "uz", "textured crop soch turmagi", "crop erkak", "informational", "estimate: low-medium", "estimate: low"],
];

const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, csv, "utf8");
console.log(`Wrote ${outPath}`);