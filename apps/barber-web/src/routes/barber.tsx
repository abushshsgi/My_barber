import { createFileRoute, useRouter } from "@tanstack/react-router";
import { BarberShell } from "@/components/barber/BarberShell";
import { BarberProvider } from "@/components/barber/BarberContext";

export const Route = createFileRoute("/barber")({
  component: BarberRoot,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-8">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          Barber panelda xatolik
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Qayta urinish
        </button>
      </div>
    );
  },
});

function BarberRoot() {
  return (
    <BarberProvider>
      <BarberShell />
    </BarberProvider>
  );
}
