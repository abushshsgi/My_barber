import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { MorphAiListKind } from "@/lib/admin-api";

export function MorphAiSeeAllLink({ kind }: { kind: MorphAiListKind }) {
  return (
    <div className="mt-4 flex justify-end border-t border-border pt-3">
      <Link
        to="/admin/morph-ai/list/$kind"
        params={{ kind }}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        Barchasi
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
