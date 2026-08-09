import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Ilova ichidagi ogohlantirishlar — yuqoridan tushib, avtomatik yo‘qoladi. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-center"
      duration={4200}
      visibleToasts={3}
      closeButton
      offset={16}
      gap={10}
      toastOptions={{
        duration: 4200,
        classNames: {
          toast:
            "group toast app-toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-sm group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          error:
            "group-[.toaster]:border-destructive/40 group-[.toaster]:bg-destructive group-[.toaster]:text-destructive-foreground",
          success:
            "group-[.toaster]:border-foreground/10 group-[.toaster]:bg-foreground group-[.toaster]:text-background",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
