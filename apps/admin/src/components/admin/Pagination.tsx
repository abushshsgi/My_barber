import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  totalPages,
  count,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  count: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const from = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-border bg-card">
      <p className="text-xs text-muted-foreground tabular-nums">
        {count === 0 ? (
          "Natija yo'q"
        ) : (
          <>
            <span className="font-medium text-foreground">
              {from}–{to}
            </span>{" "}
            / {count} dan
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          Sahifa {page} / {totalPages}
        </span>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="size-8"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="size-8"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
