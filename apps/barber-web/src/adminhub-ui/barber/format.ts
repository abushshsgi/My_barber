export function formatUZS(n: number): string {
  if (!Number.isFinite(n)) return "0 so'm";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M so'm`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K so'm`;
  return `${Math.round(n)} so'm`;
}

