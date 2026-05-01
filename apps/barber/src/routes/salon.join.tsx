import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/salon/join")({
  component: SalonJoinPage,
});

function SalonJoinPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">Salon join keyin qilinadi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hozircha faqat owner flow va salon create yoqilgan.
        </p>
      </div>
    </div>
  );
}
