import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MorphAiSubNav } from "@/components/admin/MorphAiShell";

export const Route = createFileRoute("/admin/morph-ai")({
  component: MorphAiLayout,
});

function MorphAiLayout() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
      <MorphAiSubNav />
      <Outlet />
    </div>
  );
}
