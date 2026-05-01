import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/onboarding/mybarber")({
  component: MybarberOnboardingPage,
});

function MybarberOnboardingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold">MyBarber onboarding keyin qilinadi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hozircha faqat owner flow yoqilgan. Bu sahifa vaqtincha kutish holatida.
        </p>
      </div>
    </div>
  );
}

