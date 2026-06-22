#!/usr/bin/env node
/**
 * Pixabay API dan salon cover URL ro'yxatini chiqaradi.
 * Ishlatish: PIXABAY_API_KEY=... node scripts/sync-pixabay-covers.mjs
 * Natijani apps/user/src/lib/cover-images.ts ga qo'lda yoki diff orqali qo'shing.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KEY = process.env.PIXABAY_API_KEY?.trim();
if (!KEY) {
  console.error("PIXABAY_API_KEY kerak (https://pixabay.com/api/docs/)");
  process.exit(1);
}

const QUERIES = {
  BARBER_COVERS: { q: ["barber shop", "barbershop haircut"], limit: 10 },
  BEAUTY_COVERS: { q: ["beauty salon", "hair salon"], limit: 8 },
  NAILS_COVERS: { q: ["nail salon manicure"], limit: 4 },
  SPA_COVERS: { q: ["spa wellness", "spa massage"], limit: 4 },
};

function toCdn(previewUrl, size = 640) {
  return previewUrl.replace(/_\d+\.jpg$/i, `_${size}.jpg`);
}

async function fetchHits(query, perPage = 20) {
  const params = new URLSearchParams({
    key: KEY,
    q: query,
    image_type: "photo",
    orientation: "horizontal",
    per_page: String(perPage),
    safesearch: "true",
  });
  const res = await fetch(`https://pixabay.com/api/?${params}`);
  if (!res.ok) throw new Error(`Pixabay ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.hits ?? [];
}

const seen = new Set();
const out = {};

for (const [name, { q, limit }] of Object.entries(QUERIES)) {
  const urls = [];
  for (const query of q) {
    if (urls.length >= limit) break;
    const hits = await fetchHits(query);
    for (const hit of hits) {
      if (seen.has(hit.id) || urls.length >= limit) continue;
      seen.add(hit.id);
      urls.push(toCdn(hit.previewURL));
    }
  }
  out[name] = urls;
}

const snippet = Object.entries(out)
  .map(
    ([name, urls]) =>
      `const ${name} = [\n${urls.map((u) => `  "${u}",`).join("\n")}\n] as const;`,
  )
  .join("\n\n");

console.log(snippet);
const outDir = join(process.cwd(), "tmp");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "pixabay-covers.txt"), snippet);
console.error("\nSaved tmp/pixabay-covers.txt");
