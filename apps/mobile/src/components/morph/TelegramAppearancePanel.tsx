import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useMorphAppearance } from "../../lib/MorphAppearanceContext";
import { morphFont } from "../../theme/morph-font";
import {
  MORPH_CHAT_FONT_STEPS,
  type MorphChatFontSize,
  type MorphFontSize,
  type MorphThemeName,
} from "../../theme/morph-appearance";

const DOODLES: { name: keyof typeof Ionicons.glyphMap; top: number; pct: number; rotate: string }[] = [
  { name: "flower", top: 28, pct: 8, rotate: "-18deg" },
  { name: "airplane", top: 86, pct: 72, rotate: "14deg" },
  { name: "moon", top: 160, pct: 14, rotate: "22deg" },
  { name: "cafe", top: 210, pct: 78, rotate: "-12deg" },
  { name: "musical-notes", top: 280, pct: 42, rotate: "8deg" },
  { name: "heart", top: 48, pct: 48, rotate: "-8deg" },
  { name: "star", top: 320, pct: 18, rotate: "16deg" },
];

export function TelegramAppearancePanel({ bottomInset }: { bottomInset: number }) {
  const { t } = useTranslation();
  const {
    colors: pal,
    fs,
    chatFs,
    theme,
    fontSize,
    chatFontSize,
    setTheme,
    setFontSize,
    setChatFontSize,
  } = useMorphAppearance();

  const wallpaper = pal.theme === "dark" ? "#121820" : "#C5D0C2";
  const inBubble = pal.theme === "dark" ? "#1E2A36" : "#FFFFFF";
  const outBubble = pal.theme === "dark" ? "#6B5CE7" : "#6A67D6";
  const time = "12:04";

  return (
    <View style={styles.root}>
      <View style={[styles.stage, { backgroundColor: wallpaper }]}>
        {DOODLES.map((d) => (
          <Ionicons
            key={`${d.name}-${d.top}`}
            name={d.name}
            size={28}
            color={pal.theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(40,50,40,0.10)"}
            style={[
              styles.doodle,
              { top: d.top, left: `${d.pct}%` as `${number}%`, transform: [{ rotate: d.rotate }] },
            ]}
          />
        ))}

        <Bubble
          side="in"
          bg={inBubble}
          fg={pal.fg}
          muted={pal.muted}
          time={time}
          size={chatFs(15)}
          line={chatFs(21)}
          text={t("chat.settings.chatFontPreviewAi")}
        />
        <Bubble
          side="out"
          bg={outBubble}
          fg="#FFFFFF"
          muted="rgba(255,255,255,0.72)"
          time={time}
          size={chatFs(15)}
          line={chatFs(21)}
          text={t("chat.settings.chatFontPreviewUser")}
          ticks
        />
        <Bubble
          side="in"
          bg={inBubble}
          fg={pal.fg}
          muted={pal.muted}
          time={time}
          size={chatFs(15)}
          line={chatFs(21)}
          text={t("chat.settings.fontPreview")}
        />
      </View>

      <View
        style={[
          styles.dock,
          { backgroundColor: pal.bg, borderTopColor: pal.line, paddingBottom: bottomInset },
        ]}
      >
        <View style={styles.dockRow}>
          <Text style={[styles.dockLabel, { color: pal.fg, fontSize: fs(15) }]}>
            {t("chat.settings.theme")}
          </Text>
          <View style={[styles.seg, { backgroundColor: pal.cardStrong }]}>
            {(["dark", "light"] as MorphThemeName[]).map((item) => {
              const on = theme === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setTheme(item)}
                  style={[styles.segBtn, on && { backgroundColor: pal.fg }]}
                >
                  <Text
                    style={[
                      styles.segText,
                      { color: on ? pal.bg : pal.muted, fontSize: fs(12) },
                    ]}
                  >
                    {item === "dark" ? t("chat.settings.themeDark") : t("chat.settings.themeLight")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.dockRow}>
          <Text style={[styles.dockLabel, { color: pal.fg, fontSize: fs(15) }]}>
            {t("chat.settings.uiFontSize")}
          </Text>
          <View style={[styles.seg, { backgroundColor: pal.cardStrong }]}>
            {(["s", "m", "l"] as MorphFontSize[]).map((item) => {
              const on = fontSize === item;
              const label =
                item === "s"
                  ? t("chat.settings.fontSmall")
                  : item === "m"
                    ? t("chat.settings.fontMedium")
                    : t("chat.settings.fontLarge");
              return (
                <Pressable
                  key={item}
                  onPress={() => setFontSize(item)}
                  style={[styles.segBtn, on && { backgroundColor: pal.fg }]}
                >
                  <Text
                    style={[styles.segText, { color: on ? pal.bg : pal.muted, fontSize: fs(12) }]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.sliderCaption, { color: pal.muted, fontSize: fs(12) }]}>
          {t("chat.settings.chatFontHint")}
        </Text>
        <ChatSizeSlider value={chatFontSize} onChange={setChatFontSize} />
      </View>
    </View>
  );
}

function Bubble({
  side,
  bg,
  fg,
  muted,
  time,
  size,
  line,
  text,
  ticks,
}: {
  side: "in" | "out";
  bg: string;
  fg: string;
  muted: string;
  time: string;
  size: number;
  line: number;
  text: string;
  ticks?: boolean;
}) {
  const outgoing = side === "out";
  return (
    <View style={[styles.bubbleWrap, outgoing ? styles.bubbleRight : styles.bubbleLeft]}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: bg },
          outgoing ? styles.bubbleOut : styles.bubbleIn,
        ]}
      >
        <Text style={{ ...morphFont, color: fg, fontSize: size, lineHeight: line }}>{text}</Text>
        <View style={styles.meta}>
          <Text style={[styles.time, { color: muted, fontSize: Math.max(10, size - 5) }]}>{time}</Text>
          {ticks ? (
            <Ionicons name="checkmark-done" size={Math.max(12, size - 3)} color="#9BE4FF" />
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ChatSizeSlider({
  value,
  onChange,
}: {
  value: MorphChatFontSize;
  onChange: (size: MorphChatFontSize) => void;
}) {
  const { colors: pal } = useMorphAppearance();
  const [w, setW] = useState(0);
  const steps = MORPH_CHAT_FONT_STEPS;
  const idx = Math.max(0, steps.indexOf(value));
  const thumb = 26;
  const left = useMemo(() => {
    if (w <= thumb) return 0;
    return (idx / (steps.length - 1)) * (w - thumb);
  }, [idx, steps.length, w, thumb]);

  const pick = (x: number) => {
    if (w <= 0) return;
    const i = Math.round((x / w) * (steps.length - 1));
    onChange(steps[Math.max(0, Math.min(steps.length - 1, i))]!);
  };

  return (
    <View style={styles.sliderRow}>
      <Text style={[styles.aSmall, { color: pal.fg }]}>A</Text>
      <View
        style={styles.sliderHit}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      >
        <View style={[styles.track, { backgroundColor: pal.track }]} />
        <View style={styles.notches}>
          {steps.map((step, i) => (
            <View
              key={step}
              style={[
                styles.notch,
                {
                  backgroundColor: pal.muted,
                  opacity: i === 0 || i === steps.length - 1 ? 0 : 1,
                },
              ]}
            />
          ))}
        </View>
        <View
          style={[
            styles.thumb,
            {
              left,
              backgroundColor: pal.cardStrong,
              borderColor: pal.line,
            },
          ]}
        />
      </View>
      <Text style={[styles.aBig, { color: pal.fg }]}>A</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 18,
    gap: 10,
    overflow: "hidden",
  },
  doodle: { position: "absolute" },
  bubbleWrap: { maxWidth: "82%" },
  bubbleLeft: { alignSelf: "flex-start" },
  bubbleRight: { alignSelf: "flex-end" },
  bubble: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  bubbleIn: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleOut: {
    borderRadius: 16,
    borderBottomRightRadius: 4,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  time: { ...morphFont, fontWeight: "500" },
  dock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 12,
  },
  dockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  dockLabel: { ...morphFont, fontWeight: "600", flex: 1 },
  seg: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  segBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  segText: { ...morphFont, fontWeight: "700" },
  sliderCaption: { ...morphFont, marginTop: 2 },
  sliderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  aSmall: { ...morphFont, fontSize: 13, fontWeight: "800", width: 16, textAlign: "center" },
  aBig: { ...morphFont, fontSize: 22, fontWeight: "800", width: 20, textAlign: "center" },
  sliderHit: { flex: 1, height: 44, justifyContent: "center" },
  track: { height: 3, borderRadius: 2 },
  notches: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  notch: { width: 2, height: 10, borderRadius: 1 },
  thumb: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    top: 9,
  },
});
