/** Og‘ir ish oldidan React paint qilish uchun — galereya/kamera keyin UI qotmasin. */
export function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}
