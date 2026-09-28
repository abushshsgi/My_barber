/** Bir jarayon qadami. To‘liq aytish shu vaqtning qadamlar soniga ko‘paytmasi. */
export const CARE_PROCESS_STEP_MS = 3200;

/**
 * Reja allaqachon tayyor bo‘lsa ham animatsiya kamida bitta to‘liq jarayonni ko‘rsatadi.
 * Reja kechiksa, joriy gap tugaguncha cho‘ziladi va shundan keyin yopiladi.
 */
export function thinkRevealDelay(startedAt: number, stepCount: number): number {
  const steps = Math.max(1, stepCount);
  const minMs = CARE_PROCESS_STEP_MS * steps;
  const elapsed = Math.max(0, Date.now() - startedAt);
  if (elapsed >= minMs) {
    const intoStep = elapsed % CARE_PROCESS_STEP_MS;
    return intoStep === 0 ? 0 : CARE_PROCESS_STEP_MS - intoStep;
  }
  return minMs - elapsed;
}

export function waitUntilPlanShown(startedAt: number, stepCount: number): Promise<void> {
  const delay = thinkRevealDelay(startedAt, stepCount);
  if (delay <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
