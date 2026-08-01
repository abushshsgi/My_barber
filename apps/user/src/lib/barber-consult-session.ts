import type { BarberMasterCard, ViewerCameraState } from "@/types/barber-master-card";

const CONSULT_DRAFT_KEY = "mysaloon.morphAi.barberConsultDraft";
const BOOKING_STASH_KEY = "mysaloon.morphAi.masterCardBooking";

export type BarberConsultDraft = {
  image: string;
  styleId?: string;
  styleName?: string;
  personaId?: string;
  salonId?: string | null;
  gallery?: Partial<Record<"front" | "left" | "right" | "back", string>>;
};

export type MasterCardBookingStash = {
  master_card_json: BarberMasterCard;
  style_preview_url: string;
  viewer_camera_state?: ViewerCameraState;
  style_name?: string;
};

export function stashBarberConsultDraft(draft: BarberConsultDraft) {
  try {
    sessionStorage.setItem(CONSULT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota */
  }
}

export function loadBarberConsultDraft(): BarberConsultDraft | null {
  try {
    const raw = sessionStorage.getItem(CONSULT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BarberConsultDraft;
    if (!parsed?.image) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function stashMasterCardForBooking(payload: MasterCardBookingStash) {
  try {
    sessionStorage.setItem(BOOKING_STASH_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function loadMasterCardBookingStash(): MasterCardBookingStash | null {
  try {
    const raw = sessionStorage.getItem(BOOKING_STASH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MasterCardBookingStash;
    if (!parsed?.master_card_json) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearMasterCardBookingStash() {
  try {
    sessionStorage.removeItem(BOOKING_STASH_KEY);
  } catch {
    /* ignore */
  }
}
