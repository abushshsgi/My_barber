import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, LayoutGrid, MoreHorizontal, Trash2, Users } from "lucide-react";
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

  const tab = pathname.includes("/stats")
    ? "stats"
    : pathname.endsWith("/team")
      ? "team"
      : "overview";

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

  const tabLinkCls = (key: typeof tab) =>
    cn(
      "relative inline-flex items-center gap-2 px-1 pb-3 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
      tab === key
        ? "text-foreground after:bg-primary"
        : "text-muted-foreground after:bg-transparent hover:text-foreground hover:after:bg-muted",
    );

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gradient-to-b from-primary/[0.08] via-muted/25 to-background">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-4 gap-1.5 text-muted-foreground" asChild>
          <Link to="/admin/salons">
            <ArrowLeft className="size-4" />
            Salonlar ro‘yxati
          </Link>
        </Button>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg shadow-black/5">
          <div className="border-b border-border/60 bg-gradient-to-br from-muted/60 via-card to-card px-5 py-6 sm:px-8 sm:py-8">
            {salonQ.isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-10 w-full max-w-md rounded-lg bg-muted" />
                <div className="h-4 w-48 rounded bg-muted" />
              </div>
            ) : salonQ.isError ? (
              <p className="text-sm text-destructive">{(salonQ.error as Error)?.message}</p>
            ) : s ? (
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {s.name}
                  </h1>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="tabular-nums">ID {s.id}</span>
                    {s.slug ? (
                      <>
                        <span className="hidden text-border sm:inline" aria-hidden>
                          ·
                        </span>
                        <span>
                          slug:{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                            {s.slug}
                          </code>
                        </span>
                      </>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <StatusBadge status={s.published ? "published" : "draft"} />
                    {s.premium ? (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
                        Premium
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => patchSalon.mutate({ published: !s.published })}
                    disabled={patchSalon.isPending}
                  >
                    {s.published ? "Yashirish" : "Tasdiqlash"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="size-9">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                        <Trash2 className="mr-2 size-4" />
                        O‘chirish
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : null}
          </div>

          {s ? (
            <nav
              className="flex gap-6 overflow-x-auto border-b border-border/60 bg-muted/20 px-5 sm:gap-8 sm:px-8"
              aria-label="Salon bo‘limlari"
            >
              <Link
                to="/admin/salons/$salonId"
                params={{ salonId }}
                className={tabLinkCls("overview")}
              >
                <LayoutGrid className="size-4 opacity-70" aria-hidden />
                Umumiy
              </Link>
              <Link
                to="/admin/salons/$salonId/stats"
                params={{ salonId }}
                className={tabLinkCls("stats")}
              >
                <BarChart3 className="size-4 opacity-70" aria-hidden />
                Statistika
              </Link>
              <Link
                to="/admin/salons/$salonId/team"
                params={{ salonId }}
                className={tabLinkCls("team")}
              >
                <Users className="size-4 opacity-70" aria-hidden />
                Jamoa
              </Link>
            </nav>
          ) : null}

          <div className="bg-card px-5 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>
        </div>
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
