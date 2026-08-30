import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Search } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminCareProductLikes } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/parvarish/likes")({
  component: ParvarishLikesPage,
});

function ParvarishLikesPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const likes = useQuery({
    queryKey: ["admin", "parvarish", "likes", debounced],
    queryFn: () => fetchAdminCareProductLikes({ q: debounced || undefined }),
  });

  if (likes.isLoading) {
    return <CardSkeleton className="h-64" />;
  }

  const data = likes.data;
  if (!data) {
    return <EmptyState title="Yuklanmadi" description="Likes ma'lumotini olishda xato." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Tarkib likes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Qaysi mahsulotga kim like bosgani — DB dan live.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="gap-1">
            <Heart className="size-3.5 fill-current text-rose-500" />
            {data.total_likes} like
          </Badge>
          <Badge variant="outline">{data.products_liked} mahsulot</Badge>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Mahsulot yoki brand qidirish..."
          className="pl-9"
        />
      </div>

      {data.products.length === 0 ? (
        <EmptyState
          title="Hali like yo'q"
          description="Userlar mahsulotga like bosganda shu yerda ko'rinadi."
        />
      ) : (
        <div className="space-y-4">
          {data.products.map((row) => (
            <div
              key={row.product_id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                {row.image_url ? (
                  <img
                    src={row.image_url}
                    alt=""
                    className="size-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                    <Heart className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{row.product_name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {row.brand || "—"} · {row.category}
                  </div>
                </div>
                <Badge className="gap-1 bg-rose-500/10 text-rose-600 hover:bg-rose-500/10">
                  <Heart className="size-3.5 fill-current" />
                  {row.likes_count}
                </Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Liked at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {row.likers.map((u) => (
                    <TableRow key={`${row.product_id}-${u.user_id}-${u.liked_at}`}>
                      <TableCell>
                        <div className="font-medium">
                          {u.full_name || u.username || `User #${u.user_id}`}
                        </div>
                        <div className="text-xs text-muted-foreground">#{u.user_id}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.phone || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.liked_at ? new Date(u.liked_at).toLocaleString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
