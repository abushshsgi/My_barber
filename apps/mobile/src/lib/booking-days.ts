/** Keyingi N kun — bron kalendari. */
export function buildDayList(count = 14): { key: string; label: string; full: Date }[] {
  const out: { key: string; label: string; full: Date }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const label =
      i === 0
        ? "Bugun"
        : i === 1
          ? "Ertaga"
          : d.toLocaleDateString("uz-UZ", { weekday: "short", day: "numeric", month: "short" });
    out.push({ key, label, full: d });
  }
  return out;
}

export function slotLabel(slot: { start: string } | string): string {
  if (typeof slot === "string") return slot;
  return new Date(slot.start).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function combineDateAndSlot(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  const d = new Date(day);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
