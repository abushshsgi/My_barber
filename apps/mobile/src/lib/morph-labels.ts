/** Web `aiStylePage.faceShapes` / `hairTypes` bilan bir xil o‘zbekcha yorliqlar. */

export function faceShapeLabel(key: string): string {
  switch (key) {
    case "oval":
      return "Oval yuz";
    case "round":
      return "Dumaloq yuz";
    case "square":
      return "Kvadrat yuz";
    case "heart":
      return "Yurak yuz";
    case "oblong":
      return "Uzunchoq yuz";
    default:
      return key;
  }
}

export function hairTypeLabel(key: string): string {
  switch (key) {
    case "short":
      return "Qisqa soch";
    case "medium":
      return "O‘rtacha soch";
    case "long":
      return "Uzun soch";
    default:
      return key;
  }
}

export function hairColorLabel(key: string): string {
  switch (key) {
    case "black":
      return "Qora";
    case "dark_brown":
      return "To‘q jigarrang";
    case "brown":
      return "Jigarrang";
    case "light_brown":
      return "Och jigarrang";
    case "blonde":
      return "Sariq";
    case "red":
      return "Qizg‘ish";
    case "gray":
      return "Oq/kulrang";
    case "other":
      return "Boshqa";
    default:
      return key;
  }
}

export function hairTextureLabel(key: string): string {
  switch (key) {
    case "straight":
      return "To‘g‘ri";
    case "wavy":
      return "To‘lqinsimon";
    case "curly":
      return "Jingalak";
    case "coily":
      return "Qattiq jingalak";
    default:
      return key;
  }
}

export function beardLabel(key: string): string {
  switch (key) {
    case "none":
      return "Soqolsiz";
    case "light":
      return "Yengil soqol";
    case "full":
      return "To‘liq soqol";
    default:
      return key;
  }
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
