import fs from "node:fs";
import path from "node:path";

function fileExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

const assetsDir = path.resolve(process.cwd(), "dist", "client", "assets");
if (!fileExists(assetsDir)) {
  console.error(`[create-vercel-index] Missing assets dir: ${assetsDir}`);
  process.exit(0);
}

const distRootIndex = path.resolve(process.cwd(), "dist", "index.html");
const distRootAssets = path.resolve(process.cwd(), "dist", "assets");
const outDir = path.resolve(process.cwd(), "dist", "client");
const outIndex = path.join(outDir, "index.html");

// Prefer Vite's root HTML output when present (admin app emits this).
// It contains the correct single-page client entry wiring.
if (fileExists(distRootIndex)) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(distRootIndex, outIndex);

  if (fileExists(distRootAssets)) {
    const outAssetsDir = path.join(outDir, "assets");
    fs.mkdirSync(outAssetsDir, { recursive: true });
    for (const f of fs.readdirSync(distRootAssets)) {
      fs.copyFileSync(path.join(distRootAssets, f), path.join(outAssetsDir, f));
    }
  }

  console.log(`[create-vercel-index] Copied ${distRootIndex} -> ${outIndex}`);
  process.exit(0);
}

const indexJsFiles = fs
  .readdirSync(assetsDir)
  .filter((f) => /^index-.*\.js$/.test(f))
  .map((f) => {
    const full = path.join(assetsDir, f);
    const stat = fs.statSync(full);
    return { file: f, size: stat.size };
  });

if (!indexJsFiles.length) {
  console.error(`[create-vercel-index] No index-*.js files found in ${assetsDir}`);
  process.exit(1);
}

// Heuristic: pick the largest index chunk (usually the main client entry).
indexJsFiles.sort((a, b) => b.size - a.size);
const indexJs = indexJsFiles[0].file;

const stylesCss =
  fs
    .readdirSync(assetsDir)
    .find((f) => /^styles-.*\.css$/.test(f)) || null;

const title = process.env.VITE_APP_TITLE || "Mybarber";

const stylesLink = stylesCss
  ? `<link rel="stylesheet" crossorigin href="/assets/${stylesCss}">`
  : "";

const html = `<!doctype html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    ${stylesLink}
    <script type="module" crossorigin src="/assets/${indexJs}"></script>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outIndex, html, "utf8");
console.log(`[create-vercel-index] Wrote ${outIndex} (entry: ${indexJs})`);

