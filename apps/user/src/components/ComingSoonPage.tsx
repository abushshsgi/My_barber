import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";

type ComingSoonProps = {
  title: string;
  description?: string;
};

export function ComingSoonPage({ title, description }: ComingSoonProps) {
  return (
    <ProfileSubpageLayout title={title}>
      <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
        <Sparkles className="mb-4 h-8 w-8 text-muted-foreground" />
        <p className="text-base font-bold">Tez orada</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {description ?? "Bu bo'lim ustida ishlayapmiz. Keyingi yangilanishda API bilan ulanadi."}
        </p>
      </div>
    </ProfileSubpageLayout>
  );
}

export const comingSoonRoute = (path: string, title: string, description?: string) =>
  createFileRoute(path)({
    head: () => ({ meta: [{ title: `${title} — mysaloon.uz` }] }),
    component: () => <ComingSoonPage title={title} description={description} />,
  });
