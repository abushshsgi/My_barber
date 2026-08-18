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
  status: "light" | "dark";
  fs: (size: number) => number;
  font: { fontFamily?: string };
};

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
    accent: "#0A84FF",
    iconTile: colors.surface,
    destructive: "#FF3B30",
    status: "dark",
    fs: (size) => size,
    font: {},
  };
}
