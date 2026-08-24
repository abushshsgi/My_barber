/** Web `aiStylePage.faceShapes` / `hairTypes` bilan bir xil — i18n orqali. */

import i18n from "../i18n/config";

export function faceShapeLabel(key: string): string {
  return i18n.t(`morphLabels.faceShape.${key}`, { defaultValue: key });
}

export function hairTypeLabel(key: string): string {
  return i18n.t(`morphLabels.hairType.${key}`, { defaultValue: key });
}

export function hairColorLabel(key: string): string {
  return i18n.t(`morphLabels.hairColor.${key}`, { defaultValue: key });
}

export function hairTextureLabel(key: string): string {
  return i18n.t(`morphLabels.hairTexture.${key}`, { defaultValue: key });
}

export function beardLabel(key: string): string {
  return i18n.t(`morphLabels.beard.${key}`, { defaultValue: key });
}

export const HAIR_COLOR_HEX: Record<string, string> = {
  black: "#1A1A1A",
  dark_brown: "#3B2314",
  brown: "#6B3F2A",
  light_brown: "#A67C52",
  blonde: "#D4B483",
  red: "#8B3A2F",
  gray: "#8A8A8A",
  other: "#5C5C5C",
};
