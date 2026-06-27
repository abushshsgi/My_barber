/** Analytics API scope — UI viewMode emas, haqiqiy work_mode ga qarab. */
export function resolveBarberAnalyticsParams(scope: {
  barberWorkMode: "salon" | "independent";
  activeSalonId: number | null;
}): { independent: boolean; salonId: number | null } {
  if (scope.barberWorkMode === "salon" && scope.activeSalonId != null) {
    return { independent: false, salonId: scope.activeSalonId };
  }
  return { independent: true, salonId: null };
}
