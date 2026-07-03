import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type BlockerLike = {
  status: string;
  reset?: () => void;
  proceed?: () => void;
};

type UnsavedChangesDialogProps = {
  blocker: BlockerLike;
  title?: string;
  description?: string;
  stayLabel?: string;
  leaveLabel?: string;
};

export function UnsavedChangesDialog({
  blocker,
  title = "Saqlanmagan o'zgarishlar",
  description = "Sahifadan chiqsangiz, o'zgarishlar yo'qolishi mumkin.",
  stayLabel = "Qolish",
  leaveLabel = "Chiqish",
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog
      open={blocker.status === "blocked"}
      onOpenChange={(open) => {
        if (!open) blocker.reset?.();
      }}
    >
      <AlertDialogContent className="max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel type="button" onClick={() => blocker.reset?.()}>
            {stayLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => blocker.proceed?.()}
          >
            {leaveLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
