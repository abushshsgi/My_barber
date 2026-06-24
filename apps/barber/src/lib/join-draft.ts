const JOIN_DRAFT_KEY = "barber_join_draft_v1";

export type JoinDraft = {
  salon_id: number;
  salon_name: string;
  latitude: number;
  longitude: number;
};

export function saveJoinDraft(draft: JoinDraft): void {
  sessionStorage.setItem(JOIN_DRAFT_KEY, JSON.stringify(draft));
}

export function readJoinDraft(): JoinDraft | null {
  const raw = sessionStorage.getItem(JOIN_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as JoinDraft;
    if (
      typeof parsed.salon_id !== "number" ||
      parsed.salon_id < 1 ||
      !Number.isFinite(parsed.latitude) ||
      !Number.isFinite(parsed.longitude)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearJoinDraft(): void {
  sessionStorage.removeItem(JOIN_DRAFT_KEY);
}

export function hasJoinDraft(): boolean {
  return readJoinDraft() !== null;
}
