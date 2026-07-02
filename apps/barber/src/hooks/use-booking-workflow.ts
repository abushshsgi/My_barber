import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useBookingActionMutation } from "@/hooks/use-barber-queries";
import type { CompleteBookingOptions } from "@/lib/map-booking";

type RunOpts = { onSuccess?: () => void };

/**
 * Bron lifecycle action'lari (accept/reject/cancel/start/complete).
 * Barcha bosqichlar bitta bron sahifasida qoladi — alohida navigatsiya yo'q.
 */
export function useBookingWorkflowActions(bookingId: string) {
  const navigate = useNavigate();
  const actionMut = useBookingActionMutation();

  const runAction = (action: "accept" | "reject" | "cancel" | "start", opts?: RunOpts) => {
    actionMut.mutate(
      { id: bookingId, action },
      {
        onSuccess: () => {
          if (action === "accept") {
            toast.success("Bron qabul qilindi");
          } else if (action === "start") {
            toast.success("Xizmat boshlandi");
          } else if (action === "reject") {
            toast.success("Bron rad etildi");
            void navigate({ to: "/barber/bookings" });
          } else if (action === "cancel") {
            toast.success("Bron bekor qilindi");
            void navigate({ to: "/barber/bookings" });
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
