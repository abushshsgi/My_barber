import { useContext } from "react";
import { colors } from "../theme/colors";
import { morphFont } from "../theme/morph-font";
import { AppShellContext } from "./AppShellContext";
import { useMorphAppearance } from "./MorphAppearanceContext";

export type ShellTheme = {
  morph: boolean;
  bg: string;
  fg: string;
  muted: string;
  surface: string;
  card: string;
  border: string;
  accent: string;
  iconTile: string;
  destructive: string;
  /** Tugma foni `fg`/`accent` bo‘lganda matn va ikonka. */
  onAccent: string;
  status: "light" | "dark";
  fs: (size: number) => number;
  font: { fontFamily?: string };
};

export type ShellChrome = {
  bg: string;
  fg: string;
  muted: string;
  surface: string;
  border: string;
  promo: string;
  iconTile: string;
  accent: string;
  onAccent: string;
  status: "light" | "dark";
};

export const SHELL_LIGHT: ShellChrome = {
  bg: "#FAFAFA",
  fg: "#111111",
  muted: "#737373",
  surface: "#FFFFFF",
  border: "rgba(17, 17, 17, 0.12)",
  promo: "#F0F0F0",
  iconTile: "#F0F0F0",
  accent: "#111111",
  onAccent: "#FFFFFF",
  status: "dark",
};

function onAccentFor(status: "light" | "dark"): string {
  return status === "light" ? "#111111" : "#FFFFFF";
}

export function shellChrome(pal: ShellTheme): ShellChrome {
  return {
    bg: pal.bg,
    fg: pal.fg,
    muted: pal.muted,
    surface: pal.card,
    border: pal.border,
    promo: pal.iconTile,
    iconTile: pal.iconTile,
    accent: pal.accent,
    onAccent: pal.onAccent,
    status: pal.status,
  };
}

export function useShellTheme(): ShellTheme {
  const shellCtx = useContext(AppShellContext);
  const morph = useMorphAppearance();
  const isMorph = shellCtx?.shell === "morph";
  if (isMorph) {
    const pal = morph.colors;
    return {
      morph: true,
      bg: pal.bg,
      fg: pal.fg,
      muted: pal.muted,
      surface: pal.card,
      card: pal.card,
      border: pal.line,
      accent: pal.accent,
      iconTile: pal.iconTile,
      destructive: pal.destructive,
      onAccent: onAccentFor(pal.status),
      status: pal.status,
      fs: morph.fs,
      font: morphFont,
    };
  }
  return {
    morph: false,
    bg: colors.bg,
    fg: colors.fg,
    muted: colors.muted,
    surface: colors.surface,
    card: colors.surface,
    border: colors.border,
    accent: "#111111",
    iconTile: colors.surface,
    destructive: "#FF3B30",
    onAccent: "#FFFFFF",
    status: "dark",
    fs: (size) => size,
    font: {},
  };
}
