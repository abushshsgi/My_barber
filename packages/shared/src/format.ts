export function formatSom(n: number): string {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}

export function formatKm(n?: number): string {
  if (n == null || Number.isNaN(n)) return "";
  return n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
