/** mysaloon — oq/kulrang + qora gradient (cover placeholder). */
export function brandCoverGradient(seed: string) {
  const n = String(seed)
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const light = 0.92 + (n % 6) * 0.01;
  const dark = 0.12 + (n % 5) * 0.02;
  return `linear-gradient(145deg, oklch(${light} 0 0) 0%, oklch(${dark} 0 0) 100%)`;
}
