import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { fetchBroadcasts, createBroadcast } from "@/lib/mock-api-extra";
import { TableSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { NewBroadcastDialog } from "@/components/admin/edit-dialogs";

export const Route = createFileRoute("/admin/broadcast")({ component: BroadcastPage });

function BroadcastPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["admin", "broadcasts"], queryFn: fetchBroadcasts });
  const sendMut = useMutation({
    mutationFn: createBroadcast,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "broadcasts"] });
      setOpen(false);
      toast.success("Xabarnoma yuborildi");
    },
  });

  const data = q.data ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
            Xabarnomalar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Push va SMS xabar yuborish, statistika.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4 mr-1" /> Yangi xabarnoma
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
        {q.isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : data.length === 0 ? (
          <EmptyState title="Xabarnomalar yo'q" description="Birinchisini yuboring." />
        ) : (
          <div className="divide-y divide-border">
            {data.map((b) => (
              <div key={b.id} className="px-6 py-4 hover:bg-background/50">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-lg bg-secondary flex items-center justify-center">
                    <Megaphone className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground">{b.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{b.body}</div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground tabular-nums">
                      <span>{b.audience}</span>
                      <span>·</span>
                      <span>{b.channel}</span>
                      <span>·</span>
                      <span>{b.sent_count.toLocaleString()} yuborildi</span>
                      <span>·</span>
                      <span>{b.read_count.toLocaleString()} o'qildi</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                    {format(new Date(b.created_at), "dd MMM yyyy")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NewBroadcastDialog
        open={open}
        onOpenChange={setOpen}
        loading={sendMut.isPending}
        onSend={(v) => sendMut.mutate(v)}
      />
    </div>
  );
}
