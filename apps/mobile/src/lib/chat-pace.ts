/** Gemini uslubidagi bittalab yozish — stream yoki to‘liq javobni sekin chiqaradi. */

export function createPacedWriter(onFrame: (text: string) => void) {
  let target = "";
  let shown = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let finished: ((text: string) => void) | null = null;

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const tick = () => {
    if (shown >= target.length) {
      stop();
      if (finished) {
        const done = finished;
        finished = null;
        done(target);
      }
      return;
    }
    const remain = target.length - shown;
    const step = remain > 240 ? 3 : remain > 80 ? 2 : 1;
    shown = Math.min(target.length, shown + step);
    onFrame(target.slice(0, shown));
  };

  const ensureTimer = () => {
    if (!timer) timer = setInterval(tick, 22);
  };

  return {
    append(chunk: string) {
      if (!chunk) return;
      target += chunk;
      ensureTimer();
    },
    replace(text: string) {
      target = text;
      ensureTimer();
    },
    finish() {
      return new Promise<string>((resolve) => {
        if (shown >= target.length) {
          resolve(target);
          return;
        }
        finished = resolve;
        ensureTimer();
      });
    },
    cancel() {
      stop();
      finished = null;
    },
  };
}
