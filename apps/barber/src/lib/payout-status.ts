export type PayoutStatus = "pending" | "paid" | "rejected" | string;

export function payoutStatusLabel(status: PayoutStatus): string {
  switch (status) {
    case "pending":
      return "Kutilmoqda";
    case "paid":
      return "To'landi";
    case "rejected":
      return "Rad etildi";
    default:
      return status;
  }
}

export function payoutStatusClass(status: PayoutStatus): string {
  switch (status) {
    case "paid":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
    case "pending":
      return "bg-amber-500/10 text-amber-800 border-amber-500/30";
    case "rejected":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function filterPayoutsInRange(
  payouts: Array<{ created_at: string }>,
  start: string,
  end: string,
): typeof payouts {
  return payouts.filter((p) => {
    const key = p.created_at.slice(0, 10);
    return key >= start && key <= end;
  });
}

export function sumPaidPayouts(
  payouts: Array<{ amount: string | number; status: string }>,
): number {
  return payouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
}
