import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useBookingActionMutation } from "@/hooks/use-barber-queries";
import type { CompleteBookingOptions } from "@/lib/map-booking";

type RunOpts = { onSuccess?: () => void; navigateOnFlow?: boolean };

/**
 * Bron lifecycle action'lari (accept/reject/cancel/start/complete) uchun
 * umumiy hook. `accept` → check-in sahifasi, `start` → session sahifasiga
 * navigatsiya qiladi (navigateOnFlow=true bo'lsa).
 */
export function useBookingWorkflowActions(bookingId: string) {
  const navigate = useNavigate();
  const actionMut = useBookingActionMutation();

  const runAction = (
    action: "accept" | "reject" | "cancel" | "start",
    opts?: RunOpts,
  ) => {
    const navigateOnFlow = opts?.navigateOnFlow ?? true;
    actionMut.mutate(
      { id: bookingId, action },
      {
        onSuccess: () => {
          if (action === "accept") {
            toast.success("Bron qabul qilindi");
            if (navigateOnFlow) {
              void navigate({
                to: "/barber/bookings/$bookingId/check-in",
                params: { bookingId },
                replace: true,
              });
            }
          }
          if (action === "start") {
            toast.success("Xizmat boshlandi");
            if (navigateOnFlow) {
              void navigate({
                to: "/barber/bookings/$bookingId/check-in",
                params: { bookingId },
                replace: true,
              });
            }
          }
          if (action === "reject") {
            toast.success("Bron rad etildi");
          } else if (action === "cancel") {
            toast.success("Bron bekor qilindi");
          }
          opts?.onSuccess?.();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const complete = (options: CompleteBookingOptions, opts?: { onSuccess?: () => void }) => {
    actionMut.mutate(
      { id: bookingId, action: "complete", completeOptions: options },
      {
        onSuccess: () => {
          toast.success("Xizmat yakunlandi");
          opts?.onSuccess?.();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return { runAction, complete, busy: actionMut.isPending };
}
