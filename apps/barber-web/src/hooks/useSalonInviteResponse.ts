"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolokatsiya mavjud emas"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });
}

export function useSalonInviteResponse() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipId,
      action,
      notificationId,
    }: {
      membershipId: number;
      action: "accept" | "decline";
      notificationId?: number;
    }) => {
      const path =
        action === "accept"
          ? `/api/v1/memberships/${membershipId}/accept_worker/`
          : `/api/v1/memberships/${membershipId}/decline_worker/`;

      let body: Record<string, number | string> = {};
      if (action === "accept") {
        let pos: GeolocationPosition;
        try {
          pos = await getCurrentPosition();
        } catch (e) {
          const code = (e as GeolocationPositionError)?.code;
          if (code === 1) {
            throw new Error(
              "Joylashuv ruxsati kerak — salon bilan bir joyda ekaningizni tasdiqlash uchun geolokatsiyani yoqing."
            );
          }
          if (code === 3) {
            throw new Error("Joylashuv vaqti tugadi. Qayta urinib ko‘ring.");
          }
          throw new Error("Joylashuv olinmadi. Qayta urinib ko‘ring.");
        }
        body = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
      }

      const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          typeof (data as { detail?: string }).detail === "string"
            ? (data as { detail: string }).detail
            : "So‘rov bajarilmadi";
        throw new Error(detail);
      }
      if (notificationId) {
        await apiFetch(`/api/v1/notifications/${notificationId}/read/`, { method: "POST" });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["memberships"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
