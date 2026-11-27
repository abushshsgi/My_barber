/** Prevent duplicate barcode submits within a time window. */

export function isDuplicateBarcodeSubmit(
  code: string,
  lastCode: string | null,
  lastAtMs: number,
  nowMs: number,
  windowMs = 8000,
): boolean {
  if (!lastCode || lastCode !== code) return false;
  return nowMs - lastAtMs < windowMs;
}

export class ScanLock {
  private locked = false;
  private generation = 0;

  tryAcquire(): { ok: true; generation: number } | { ok: false } {
    if (this.locked) return { ok: false };
    this.locked = true;
    this.generation += 1;
    return { ok: true, generation: this.generation };
  }

  release(generation?: number): void {
    if (generation !== undefined && generation !== this.generation) return;
    this.locked = false;
  }

  isLocked(): boolean {
    return this.locked;
  }

  currentGeneration(): number {
    return this.generation;
  }

  reset(): void {
    this.locked = false;
    this.generation += 1;
  }
}
