export function paymentLabel(method?: string | null): string {
  if (method === "online") return "Onlayn";
  if (method === "cash") return "Naqd";
  return "—";
}

export function paymentBadgeClass(method?: string | null): string {
  if (method === "online") return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (method === "cash") return "bg-amber-500/10 text-amber-800 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}
