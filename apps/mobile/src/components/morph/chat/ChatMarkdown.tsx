import { Fragment, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  content: string;
  color?: string;
};

type Block =
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string };

function parseBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const flushPara = (buf: string[]) => {
    const text = buf.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        code.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      if (code.length) blocks.push({ type: "p", text: code.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "h", level, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quote: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("> ")) {
        quote.push((lines[i] ?? "").trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? "").trim())) {
        items.push((lines[i] ?? "").trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const next = (lines[i] ?? "").trim();
      if (
        !next ||
        next.startsWith("```") ||
        /^#{1,3}\s+/.test(next) ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next) ||
        next.startsWith("> ")
      ) {
        break;
      }
      para.push(next);
      i += 1;
    }
    flushPara(para);
  }

  return blocks;
}

function renderInline(text: string, color: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <Text key={key} style={[styles.bold, { color }]}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <Text key={key} style={styles.code}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <Text key={key} style={[styles.italic, { color }]}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return (
      <Text key={key} style={{ color }}>
        {part}
      </Text>
    );
  });
}

export function ChatMarkdown({ content, color = "#111111" }: Props) {
  const blocks = parseBlocks(content.trim() || content);

  if (!blocks.length) {
    return (
      <Text style={[styles.p, { color }]}>{content}</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {blocks.map((block, idx) => {
        if (block.type === "h") {
          return (
            <Text
              key={`h-${idx}`}
              style={[
                styles.h,
                block.level === 1 && styles.h1,
                block.level === 2 && styles.h2,
                block.level === 3 && styles.h3,
                { color },
              ]}
            >
              {renderInline(block.text, color, `h-${idx}`)}
            </Text>
          );
        }
        if (block.type === "quote") {
          return (
            <View key={`q-${idx}`} style={styles.quote}>
              <Text style={[styles.p, styles.quoteText]}>
                {renderInline(block.text, "#52525B", `q-${idx}`)}
              </Text>
            </View>
          );
        }
        if (block.type === "ul" || block.type === "ol") {
          return (
            <View key={`l-${idx}`} style={styles.list}>
              {block.items.map((item, itemIdx) => (
                <View key={`l-${idx}-${itemIdx}`} style={styles.li}>
                  <Text style={[styles.mark, { color }]}>
                    {block.type === "ol" ? `${itemIdx + 1}.` : "•"}
                  </Text>
                  <Text style={[styles.p, styles.liText, { color }]}>
                    {renderInline(item, color, `l-${idx}-${itemIdx}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={`p-${idx}`} style={[styles.p, { color }]}>
            {renderInline(block.text, color, `p-${idx}`).map((node, nIdx) => (
              <Fragment key={`p-${idx}-n-${nIdx}`}>{node}</Fragment>
            ))}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  p: {
    fontSize: 16,
    lineHeight: 26,
  },
  h: {
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  h1: {
    fontSize: 22,
    lineHeight: 28,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
  },
  h3: {
    fontSize: 16,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  code: {
    fontFamily: "monospace",
    fontSize: 14,
    backgroundColor: "#F4F4F5",
    color: "#18181B",
  },
  list: {
    gap: 6,
  },
  li: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  mark: {
    width: 18,
    fontSize: 16,
    lineHeight: 26,
  },
  liText: {
    flex: 1,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: "#E4E4E7",
    paddingLeft: 12,
  },
  quoteText: {
    color: "#52525B",
  },
});
