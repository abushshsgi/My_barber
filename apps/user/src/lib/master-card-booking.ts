import {
  clearMasterCardBookingStash,
  loadMasterCardBookingStash,
} from "@/lib/barber-consult-session";
import type { CreateBookingPayload } from "@/lib/api/bookings";

/** Merge stashed Morf AI Master Card into a booking create payload (once). */
export function withMasterCardBookingFields(
  payload: CreateBookingPayload,
): CreateBookingPayload {
  const stash = loadMasterCardBookingStash();
  if (!stash?.master_card_json) return payload;

  const next: CreateBookingPayload = {
    ...payload,
    master_card_json: stash.master_card_json as unknown as Record<string, unknown>,
    style_preview_url: stash.style_preview_url || undefined,
    viewer_camera_state: stash.viewer_camera_state as unknown as
      | Record<string, unknown>
      | undefined,
  };

  if (!next.notes?.trim()) {
    const name = stash.style_name || stash.master_card_json.style_overview?.name || "";
    next.notes = name
      ? `Morf AI Master Card biriktirilgan: ${name}`
      : "Morf AI Master Card biriktirilgan.";
  }

  clearMasterCardBookingStash();
  return next;
}
