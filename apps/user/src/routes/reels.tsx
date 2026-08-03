import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MobileBackButton } from "@/components/mobile/MobileBackButton";
import { navigateBack } from "@/lib/mobile-back";

export const Route = createFileRoute("/reels")({
  head: () => ({
    meta: [
      { title: "Reels — mysaloon.uz" },
      { name: "description", content: "Salonlardan trend uslublar video lentasi." },
    ],
  }),
  component: ReelsPage,
});

function ReelsPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-full flex-col bg-foreground text-background">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+12px)]">
        <MobileBackButton
          onClick={() => navigateBack(router, "/")}
          className="bg-background/15 text-background hover:bg-background/25"
          aria-label="Orqaga"
        />
        <h1 className="text-lg font-bold">Reels</h1>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-24 pt-20">
        <EmptyState
          icon={<Clapperboard className="h-7 w-7" />}
          title="Reels tez orada"
          description="Salon video lentasi API ulanganda shu yerda ko'rinadi."
          className="text-background [&_.text-muted-foreground]:text-background/70"
        />
      </div>
    </div>
  );
}
