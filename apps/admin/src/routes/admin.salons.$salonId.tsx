import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LayoutGrid, MoreHorizontal, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchAdminSalonDetail, patchAdminSalon, deleteAdminSalon } from "@/lib/admin-api";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/salons/$salonId")({
  component: SalonIdLayout,
});

function SalonIdLayout() {
  const { salonId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const tab = pathname.endsWith("/team") ? "team" : "overview";

  const salonQ = useQuery({
    queryKey: ["admin", "salon", salonId],
    queryFn: () => fetchAdminSalonDetail(salonId),
  });

  const patchSalon = useMutation({
    mutationFn: (body: Parameters<typeof patchAdminSalon>[1]) => patchAdminSalon(salonId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "salon", salonId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "salons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Salon yangilandi");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeSalon = useMutation({
    mutationFn: () => deleteAdminSalon(salonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "salons"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success("Salon o‘chirildi");
      navigate({ to: "/admin/salons" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = salonQ.data;

  const tabCls = (key: typeof tab) =>
    cn(
      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      tab === key
        ? "bg-foreground text-background"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
    );

  return (
    <div className="min-h-[50vh] bg-gradient-to-b from-muted/25 to-background">
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-4">
          <Link
            to="/admin/salons"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="size-4" /> Salonlar
          </Link>

          {salonQ.isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-9 w-64 bg-muted rounded-lg" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          ) : salonQ.isError ? (
            <p className="text-sm text-destructive">{(salonQ.error as Error)?.message}</p>
          ) : s ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="font-heading text-2xl font-semibold tracking-tight truncate">
                  {s.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ID {s.id}
                  {s.slug ? (
                    <span className="ml-2 tabular-nums">
                      · slug: <span className="text-foreground">{s.slug}</span>
                    </span>
                  ) : null}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={s.published ? "published" : "draft"} />
                  {s.premium ? (
                    <span className="rounded-md bg-amber-500/15 text-amber-900 dark:text-amber-200 px-2 py-0.5 text-xs font-medium">
                      Premium
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => patchSalon.mutate({ published: !s.published })}
                  disabled={patchSalon.isPending}
                >
                  {s.published ? "Yashirish" : "Tasdiqlash"}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-9">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="size-4 mr-2" />
                      O‘chirish
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ) : null}

          {s ? (
            <nav className="mt-6 flex flex-wrap gap-1 border-t border-border pt-4">
              <Link
                to="/admin/salons/$salonId"
                params={{ salonId }}
                className={tabCls("overview")}
              >
                <LayoutGrid className="size-4" /> Umumiy
              </Link>
              <Link
                to="/admin/salons/$salonId/team"
                params={{ salonId }}
                className={tabCls("team")}
              >
                <Users className="size-4" /> Jamoa
              </Link>
            </nav>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Salonni o‘chirish"
        description={s ? `"${s.name}" salonini o‘chirishni tasdiqlaysizmi?` : ""}
        loading={removeSalon.isPending}
        onConfirm={() => removeSalon.mutate()}
      />
    </div>
  );
}
