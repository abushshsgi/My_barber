import { Fragment, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View, type TextStyle } from "react-native";
import { morphFont } from "../../../theme/morph-font";
import {
  fontSize,
  moderateScale,
  scale,
  verticalScale,
} from "../../../utils/responsive";

type Props = {
  content: string;
  color?: string;
  scale?: number;
};

type Block =
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "hr" }
  | { type: "table"; headers: string[]; rows: string[][] };

const wrapText: TextStyle =
  Platform.OS === "web"
    ? ({ wordBreak: "break-word", overflowWrap: "anywhere" } as TextStyle)
    : {};

function splitTableRow(line: string): string[] {
  const raw = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return raw.split("|").map((c) => c.trim());
}

function isTableSep(line: string): boolean {
  const cells = splitTableRow(line);
  if (!cells.length) return false;
  return cells.every((c) => /^:?-{3,}:?$/.test(c));
}

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
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    // Markdown table: | h | h | + |---|---| + rows
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isTableSep((lines[i + 1] ?? "").trim())
    ) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length) {
        const rowLine = (lines[i] ?? "").trim();
        if (!rowLine.includes("|") || isTableSep(rowLine)) break;
        const cells = splitTableRow(rowLine);
        if (cells.some((c) => c.length > 0)) {
          while (cells.length < headers.length) cells.push("");
          rows.push(cells.slice(0, Math.max(headers.length, cells.length)));
        }
        i += 1;
      }
      if (headers.length) blocks.push({ type: "table", headers, rows });
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: "h", level, text: heading[2].trim() });
      i += 1;
      continue;
    }

    if (/^([-*_])\1{2,}$/.test(trimmed)) {
      blocks.push({ type: "hr" });
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
        next.startsWith("> ") ||
        /^([-*_])\1{2,}$/.test(next) ||
        (next.includes("|") &&
          i + 1 < lines.length &&
          isTableSep((lines[i + 1] ?? "").trim()))
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
  // **bold**, `code`, *italic*, $formula$
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\$[^$]+\$)/g);
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
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      return (
        <Text key={key} style={styles.formula}>
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

export function ChatMarkdown({ content, color = "#111111", scale = 1 }: Props) {
  const blocks = parseBlocks(content.trim() || content);
  const fs = (n: number) => Math.round(n * scale);

  if (!blocks.length) {
    return (
      <Text style={[styles.p, { color, fontSize: fs(13), lineHeight: fs(19) }]}>{content}</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {blocks.map((block, idx) => {
        if (block.type === "h") {
          const size = block.level === 1 ? 16 : block.level === 2 ? 14 : 13;
          return (
            <Text
              key={`h-${idx}`}
              style={[
                styles.h,
                wrapText,
                { color, fontSize: fs(size), lineHeight: fs(size + 6) },
              ]}
            >
              {renderInline(block.text, color, `h-${idx}`)}
            </Text>
          );
        }
        if (block.type === "hr") {
          return <View key={`hr-${idx}`} style={styles.hr} />;
        }
        if (block.type === "code") {
          return (
            <View key={`c-${idx}`} style={styles.codeBlock}>
              <Text style={[styles.codeBlockText, wrapText, { fontSize: fs(12), lineHeight: fs(18) }]}>
                {block.text}
              </Text>
            </View>
          );
        }
        if (block.type === "quote") {
          return (
            <View key={`q-${idx}`} style={styles.quote}>
              <Text style={[styles.p, styles.quoteText, wrapText, { fontSize: fs(13), lineHeight: fs(19) }]}>
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
                  <Text style={[styles.p, styles.liText, wrapText, { color, fontSize: fs(13), lineHeight: fs(19) }]}>
                    {renderInline(item, color, `l-${idx}-${itemIdx}`)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        if (block.type === "table") {
          const colCount = Math.max(block.headers.length, ...block.rows.map((row) => row.length), 1);
          const cellSize = colCount >= 4 ? 11 : 12;
          const cellLine = cellSize + 4;
          return (
            <View key={`t-${idx}`} style={styles.table}>
              <View style={[styles.tr, styles.trHead]}>
                {Array.from({ length: colCount }, (_, c) => (
                  <View
                    key={`th-${idx}-${c}`}
                    style={[styles.td, c === colCount - 1 && styles.tdLast]}
                  >
                    <Text style={[styles.thText, wrapText, { fontSize: fs(cellSize), lineHeight: fs(cellLine) }]}>
                      {renderInline(block.headers[c] ?? "", "#111111", `th-${idx}-${c}`)}
                    </Text>
                  </View>
                ))}
              </View>
              {block.rows.map((row, rIdx) => (
                <View
                  key={`tr-${idx}-${rIdx}`}
                  style={[styles.tr, rIdx % 2 === 1 && styles.trAlt, rIdx === block.rows.length - 1 && styles.trLast]}
                >
                  {Array.from({ length: colCount }, (_, c) => (
                    <View
                      key={`td-${idx}-${rIdx}-${c}`}
                      style={[styles.td, c === colCount - 1 && styles.tdLast]}
                    >
                      <Text style={[styles.tdText, wrapText, { color, fontSize: fs(cellSize), lineHeight: fs(cellLine) }]}>
                        {renderInline(row[c] ?? "", color, `td-${idx}-${rIdx}-${c}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={`p-${idx}`} style={[styles.p, wrapText, { color, fontSize: fs(13), lineHeight: fs(19) }]}>
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
    width: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    gap: moderateScale(8),
  },
  p: {
    ...morphFont,
    width: "100%",
    fontSize: fontSize(13),
    lineHeight: fontSize(19),
  },
  h: {
    ...morphFont,
    fontWeight: "600",
    letterSpacing: -0.2,
    marginTop: verticalScale(2),
  },
  bold: {
    fontWeight: "700",
  },
  italic: {
    fontStyle: "italic",
  },
  code: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: fontSize(12),
    backgroundColor: "#F4F4F5",
    color: "#18181B",
  },
  codeBlock: {
    width: "100%",
    minWidth: 0,
    backgroundColor: "#F4F4F5",
    borderRadius: moderateScale(12),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
  },
  codeBlockText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: "#18181B",
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(17,17,17,0.16)",
    marginVertical: verticalScale(4),
  },
  formula: {
    fontFamily: "monospace",
    fontSize: fontSize(13),
    color: "#18181B",
    backgroundColor: "#EEF2FF",
    fontWeight: "600",
  },
  list: {
    gap: moderateScale(5),
  },
  li: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    minWidth: 0,
    gap: moderateScale(8),
  },
  mark: {
    width: scale(16),
    fontSize: fontSize(14),
    lineHeight: fontSize(21),
  },
  liText: {
    flex: 1,
    minWidth: 0,
  },
  quote: {
    width: "100%",
    minWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: "#E4E4E7",
    paddingLeft: scale(12),
  },
  quoteText: {
    color: "#52525B",
  },
  table: {
    width: "100%",
    minWidth: 0,
    alignSelf: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(17,17,17,0.16)",
    borderRadius: moderateScale(12),
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  tr: {
    flexDirection: "row",
    alignItems: "stretch",
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17,17,17,0.1)",
  },
  trHead: {
    backgroundColor: "#F4F4F5",
  },
  trAlt: {
    backgroundColor: "rgba(17,17,17,0.03)",
  },
  trLast: {
    borderBottomWidth: 0,
  },
  td: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(8),
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(17,17,17,0.1)",
  },
  tdLast: {
    borderRightWidth: 0,
  },
  thText: {
    ...morphFont,
    fontWeight: "700",
    color: "#111111",
  },
  tdText: {
    ...morphFont,
  },
});
