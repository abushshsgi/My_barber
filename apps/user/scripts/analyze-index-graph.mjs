/**
 * Rollup module attribution for the main client index chunk (post-build).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "../dist/client/assets");
const OUT = path.resolve(__dirname, "../../../docs/mysaloon-v3-qa/bundle-index-modules.json");

if (!fs.existsSync(ASSETS)) {
  console.error("Run npm run build in apps/user first");
  process.exit(1);
}

const indexFile = fs
  .readdirSync(ASSETS)
  .filter((f) => /^index-.*\.js$/.test(f))
  .sort((a, b) => fs.statSync(path.join(ASSETS, b)).size - fs.statSync(path.join(ASSETS, a)).size)[0];

if (!indexFile) {
  console.error("No index-*.js in dist");
  process.exit(1);
}

const text = fs.readFileSync(path.join(ASSETS, indexFile), "utf8");
const patterns = [
  { id: "routeTree.gen", re: /routeTree\.gen/g },
  { id: "routeTree.public", re: /routeTree\.public/g },
  { id: "vendor-radix", re: /@radix-ui/g },
  { id: "vendor-router", re: /@tanstack\/react-router/g },
  { id: "vendor-query", re: /@tanstack\/react-query/g },
  { id: "i18next", re: /i18next/g },
  { id: "lucide-react", re: /lucide-react/g },
  { id: "framer-motion", re: /framer-motion/g },
  { id: "mediapipe", re: /@mediapipe/g },
  { id: "zxing", re: /@zxing/g },
  { id: "firebase", re: /firebase/g },
];

const modules = patterns.map(({ id, re }) => ({
  id,
  occurrences: (text.match(re) ?? []).length,
}));

const report = {
  generatedAt: new Date().toISOString(),
  indexFile,
  indexRawBytes: fs.statSync(path.join(ASSETS, indexFile)).size,
  moduleSignals: modules.sort((a, b) => b.occurrences - a.occurrences),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));