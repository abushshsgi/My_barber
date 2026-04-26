import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const q = useQuery({ queryKey: ["admin", "categories"], queryFn: () => fetchCategories() });
  const data = q.data ?? [];
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Kategoriyalar
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Xizmat kategoriyalari va tartibi.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((c) => (
          <div
            key={c.id}
            className="bg-card rounded-2xl border border-border shadow-card p-5 flex items-center gap-4"
          >
            <div className="size-12 rounded-xl bg-secondary flex items-center justify-center text-2xl">
              {c.icon}
            </div>
            <div className="flex-1">
              <div className="font-heading font-semibold text-foreground">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {c.services_count} ta xizmat · #{c.order}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
