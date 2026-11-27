export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "link"; text: string; href: string };

export type ArticleBlock =
  | { type: "h2"; id: string; text: string }
  | { type: "h3"; id: string; text: string }
  | { type: "p"; inlines: Inline[] }
  | { type: "ul"; items: Inline[][] };

export function headingId(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function parseInlines(source: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: "text", text: source.slice(last, index) });
    if (match[1] && match[2]) {
      const href = match[2];
      if (href.startsWith("/") || href.startsWith("https://")) {
        out.push({ kind: "link", text: match[1], href });
      } else {
        out.push({ kind: "text", text: match[0] });
      }
    } else if (match[3]) {
      out.push({ kind: "strong", text: match[3] });
    }
    last = index + match[0].length;
  }
  if (last < source.length) out.push({ kind: "text", text: source.slice(last) });
  return out.filter((part) => part.kind !== "text" || part.text.length > 0);
}

export function parseArticleMarkdown(source: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    paragraph = [];
    if (text) blocks.push({ type: "p", inlines: parseInlines(text) });
  };
  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: "ul", items: list.map((item) => parseInlines(item)) });
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      const text = line.slice(4).trim();
      blocks.push({ type: "h3", id: headingId(text), text });
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      const text = line.slice(3).trim();
      blocks.push({ type: "h2", id: headingId(text), text });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      list.push(line.slice(2).trim());
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function tableOfContents(
  blocks: ArticleBlock[],
): Array<{ id: string; text: string; level: 2 | 3 }> {
  return blocks.flatMap((block) => {
    if (block.type === "h2") return [{ id: block.id, text: block.text, level: 2 as const }];
    if (block.type === "h3") return [{ id: block.id, text: block.text, level: 3 as const }];
    return [];
  });
}
