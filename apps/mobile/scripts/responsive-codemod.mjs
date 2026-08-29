#!/usr/bin/env node
/**
 * StyleSheet.create({...}) bloklaridagi qattiq piksel qiymatlarini
 * `src/utils/responsive.ts` utilitalariga o'tkazadi.
 *
 * Ishlatish:
 *   node scripts/responsive-codemod.mjs src/screens/morph/MorphCareScreen.tsx
 *   node scripts/responsive-codemod.mjs --all
 */
import { globSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const HORIZONTAL = new Set([
  "width",
  "minWidth",
  "maxWidth",
  "paddingHorizontal",
  "paddingLeft",
  "paddingRight",
  "marginHorizontal",
  "marginLeft",
  "marginRight",
  "left",
  "right",
]);

const VERTICAL = new Set([
  "height",
  "minHeight",
  "maxHeight",
  "paddingVertical",
  "paddingTop",
  "paddingBottom",
  "marginVertical",
  "marginTop",
  "marginBottom",
  "top",
  "bottom",
]);

const MODERATE = new Set([
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "padding",
  "margin",
  "gap",
  "rowGap",
  "columnGap",
]);

const TEXT = new Set(["fontSize", "lineHeight"]);

/** Bu qatorlar hech qachon o'zgartirilmaydi. */
const SKIP_LINE = /shadowOffset|textShadowOffset|transform|aspectRatio/;

const HELPERS = { scale: false, verticalScale: false, moderateScale: false, fontSize: false };

function helperFor(prop) {
  if (TEXT.has(prop)) return "fontSize";
  if (HORIZONTAL.has(prop)) return "scale";
  if (VERTICAL.has(prop)) return "verticalScale";
  if (MODERATE.has(prop)) return "moderateScale";
  return null;
}

/** `StyleSheet.create({` dan boshlab mos yopiluvchi `})` gacha bo'lgan oraliqlar. */
function styleSheetRanges(source) {
  const ranges = [];
  const marker = "StyleSheet.create({";
  let from = 0;
  for (;;) {
    const start = source.indexOf(marker, from);
    if (start === -1) break;
    let depth = 0;
    let i = start + marker.length - 1;
    for (; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    ranges.push([start, i]);
    from = i + 1;
  }
  return ranges;
}

const DECL = /(\b[a-zA-Z]+)(\s*:\s*)(-?\d+(?:\.\d+)?)(\s*[,}])/g;

/** Bitta style obyekti ichidagi qiymatlarni almashtiradi. */
function transformStyleObject(text, stats) {
  /**
   * Kvadrat elementlar (avatar, ikonka, doira) — `width === height` bo'lsa
   * ikkalasi ham gorizontal `scale` bilan o'lchanadi, aks holda doiralar
   * ovalga aylanib qoladi.
   */
  const sizes = new Map();
  for (const line of text.split("\n")) {
    // `shadowOffset: { width: 0, height: 6 }` kvadratlikni aldab yubormasin.
    if (SKIP_LINE.test(line)) continue;
    for (const [, prop, , raw] of line.matchAll(DECL)) {
      if (prop === "width" || prop === "height") sizes.set(prop, Number(raw));
    }
  }
  const isSquare =
    sizes.has("width") && sizes.has("height") && sizes.get("width") === sizes.get("height");

  return text
    .split("\n")
    .map((line) => {
      if (SKIP_LINE.test(line)) return line;
      return line.replace(DECL, (match, prop, sep, rawValue, tail) => {
        let helper = helperFor(prop);
        if (!helper) return match;
        if (isSquare && prop === "height") helper = "scale";

        const value = Number(rawValue);
        // 0/1 — hairline va nol qiymatlar; 999 — pill radius.
        if (!Number.isFinite(value) || Math.abs(value) <= 1 || value === 999) return match;

        HELPERS[helper] = true;
        stats.count += 1;
        const call = `${helper}(${Math.abs(value)})`;
        return `${prop}${sep}${value < 0 ? `-${call}` : call}${tail}`;
      });
    })
    .join("\n");
}

function ensureImport(source, importPath) {
  const used = Object.entries(HELPERS)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort();
  if (used.length === 0) return source;

  const existing = new RegExp(
    `import\\s*\\{([^}]*)\\}\\s*from\\s*"${importPath.replace(/\//g, "\\/")}";`,
  );
  const match = source.match(existing);

  if (match) {
    const current = match[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const merged = [...new Set([...current, ...used])].sort();
    return source.replace(
      existing,
      `import {\n  ${merged.join(",\n  ")},\n} from "${importPath}";`,
    );
  }

  const lastImport = [...source.matchAll(/^import .*?;$/gms)].pop();
  if (!lastImport) return source;
  const insertAt = lastImport.index + lastImport[0].length;
  return (
    source.slice(0, insertAt) +
    `\nimport {\n  ${used.join(",\n  ")},\n} from "${importPath}";` +
    source.slice(insertAt)
  );
}

function relativeResponsivePath(file) {
  const target = path.resolve("src/utils/responsive");
  const rel = path.relative(path.dirname(path.resolve(file)), target);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function processFile(file) {
  const original = readFileSync(file, "utf8");
  for (const key of Object.keys(HELPERS)) HELPERS[key] = false;

  const stats = { count: 0 };
  if (styleSheetRanges(original).length === 0) return null;

  let output = replaceStyleObjects(original, (text) =>
    transformStyleObject(text, stats),
  );
  if (stats.count === 0) return null;

  output = ensureImport(output, relativeResponsivePath(file));
  writeFileSync(file, output, "utf8");
  return stats.count;
}

/**
 * Allaqachon o'zgartirilgan fayllarni to'g'rilaydi: `width: scale(N)` va
 * `height: verticalScale(N)` bir xil N bilan uchrasa — bu kvadrat element,
 * balandligi ham `scale` bo'lishi kerak.
 */
function repairSquares(file) {
  const original = readFileSync(file, "utf8");
  let fixed = 0;

  const output = replaceStyleObjects(original, (text) => {
    const sizes = new Map();
    for (const line of text.split("\n")) {
      if (SKIP_LINE.test(line)) continue;
      for (const [, prop, , helper, raw] of line.matchAll(
        /(\b(?:width|height))(\s*:\s*)(scale|verticalScale)\((\d+(?:\.\d+)?)\)/g,
      )) {
        sizes.set(prop, { helper, value: Number(raw) });
      }
    }

    const w = sizes.get("width");
    const h = sizes.get("height");
    if (!w || !h || w.value !== h.value || h.helper !== "verticalScale") return text;

    return text
      .split("\n")
      .map((line) => {
        if (SKIP_LINE.test(line)) return line;
        return line.replace(
          new RegExp(`(\\bheight\\s*:\\s*)verticalScale\\(${h.value}\\)`),
          (m, head) => {
            fixed += 1;
            return `${head}scale(${h.value})`;
          },
        );
      })
      .join("\n");
  });

  if (fixed === 0) return null;
  writeFileSync(file, output, "utf8");
  return fixed;
}

/** StyleSheet bloklaridagi har bir style obyektiga `fn` ni qo'llaydi. */
function replaceStyleObjects(source, fn) {
  let result = "";
  let cursor = 0;
  for (const [start, end] of styleSheetRanges(source)) {
    result += source.slice(cursor, start);

    const block = source.slice(start, end + 1);
    let inner = "";
    let blockCursor = 0;
    let depth = 0;
    let objectStart = -1;
    for (let i = 0; i < block.length; i += 1) {
      const ch = block[i];
      if (ch === "{") {
        depth += 1;
        if (depth === 2) objectStart = i;
      } else if (ch === "}") {
        if (depth === 2 && objectStart !== -1) {
          inner += block.slice(blockCursor, objectStart);
          inner += fn(block.slice(objectStart, i + 1));
          blockCursor = i + 1;
          objectStart = -1;
        }
        depth -= 1;
      }
    }
    result += inner + block.slice(blockCursor);
    cursor = end + 1;
  }
  return result + source.slice(cursor);
}

const args = process.argv.slice(2);

if (args[0] === "--repair-squares") {
  let repaired = 0;
  for (const file of args.slice(1)) {
    const n = repairSquares(file);
    if (n) {
      repaired += n;
      console.log(`${file}: ${n} kvadrat element to'g'rilandi`);
    }
  }
  console.log(`Jami: ${repaired}`);
  process.exit(0);
}

const files = args.includes("--all")
  ? globSync("src/**/*.tsx").filter((f) => !f.includes("__tests__"))
  : args;

let total = 0;
for (const file of files) {
  const changed = processFile(file);
  if (changed) {
    total += changed;
    console.log(`${file}: ${changed} qiymat almashtirildi`);
  }
}
console.log(`Jami: ${total}`);
