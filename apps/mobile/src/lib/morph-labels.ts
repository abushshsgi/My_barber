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
