import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ImageOff } from "lucide-react";
import {
  downloadMorphAiListCsv,
  fetchMorphAiList,
  MORPH_AI_LIST_KINDS,
  PAGE_SIZE,
  type MorphAiListKind,
} from "@/lib/admin-api";
import { resolveMediaUrl } from "@/lib/media-url";
import {
  ExportButton,
  StatsPageHeader,
  useStatsRange,
} from "@/components/admin/StatisticsShell";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const KIND_META: Record<
  MorphAiListKind,
  { title: string; description: string; usesRange: boolean }
> = {
  generations: {
    title: "Barcha generatsiyalar",
    description: "Morph AI so'rovlari — boshidan oxirigacha.",
    usesRange: true,
  },
  spenders: {
    title: "Kim qancha xarajat qilmoqda",
    description: "Token va USD bo'yicha barcha foydalanuvchilar.",
    usesRange: true,
  },
  errors: {
    title: "Barcha xatolar",
    description: "Failed try-on / tahlil yozuvlari — to'liq tarix.",
    usesRange: true,
  },
  "active-users": {
    title: "Bugungi eng faol userlar",
    description: "Bugungi try-on faolligi — to'liq ro'yxat.",
    usesRange: false,
  },
  queue: {
    title: "Navbatdagi joblar",
    description: "Redis try-on navbatidagi barcha joblar.",
    usesRange: false,
  },
  daily: {
    title: "Kunlik xarajat",
    description: "Kunlik USD va generatsiya — to'liq jadval.",
    usesRange: true,
  },
  gallery: {
    title: "Preview gallery",
    description: "AI Style tarixidagi barcha selfilar.",
    usesRange: false,
  },
};

function isMorphKind(v: string): v is MorphAiListKind {
  return (MORPH_AI_LIST_KINDS as readonly string[]).includes(v);
}

export const Route = createFileRoute("/admin/morph-ai/list/$kind")({
  validateSearch: (raw: Record<string, unknown>) => {
    const pageRaw = raw.page;
    let page = 1;
    if (typeof pageRaw === "number" && Number.isFinite(pageRaw) && pageRaw >= 1) {
      page = Math.floor(pageRaw);
    } else if (typeof pageRaw === "string") {
      const n = Number(pageRaw);
      if (Number.isFinite(n) && n >= 1) page = Math.floor(n);
    }
    return { page };
  },
  component: MorphAiListPage,
});

function formatUsd(raw: unknown): string {
  const n = typeof raw === "number" ? raw : Number(raw || 0);
  if (!Number.isFinite(n)) return "$0.00";
  if (n === 0) return "$0.00";
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function formatTokens(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function kindLabel(kind: unknown): string {
  const k = String(kind || "");
  if (k === "tryon") return "Try-on";
  if (k === "analyze") return "Tahlil";
  if (k === "face_check") return "Yuz tekshiruv";
  if (k === "studio") return "Studio";
  return k || "—";
}

function GalleryThumb({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex aspect-[3/4] flex-col items-center justify-center gap-1 bg-muted text-xs text-muted-foreground">
        <ImageOff className="size-5 opacity-60" />
        Yo‘q
      </div>
    );
  }
  return (
    <img src={src} alt={alt} className="aspect-[3/4] w-full object-cover" onError={() => setFailed(true)} />
  );
}

function MorphAiListPage() {
  const { kind: kindParam } = Route.useParams();
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const kindOk = isMorphKind(kindParam);
  const kind: MorphAiListKind = kindOk ? kindParam : "generations";
  const meta = KIND_META[kind];
  const { rangeKey, setRangeKey, range } = useStatsRange("30d");

  const q = useQuery({
    queryKey: ["admin", "morph-ai", "list", kind, range.start, range.end, page],
    queryFn: () =>
      fetchMorphAiList(kind, {
        range: meta.usesRange ? range : undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    enabled: kindOk,
  });

  if (!kindOk) {
    return (
      <EmptyState
        title="Noma'lum ro'yxat"
        description="Bu Morph AI ro'yxat turi mavjud emas."
      />
    );
  }

  const d = q.data;
  const rows = (d?.results || []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <div>
        {kind === "errors" ? (
          <Link to="/admin/morph-ai/errors" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Orqaga
          </Link>
        ) : kind === "active-users" ? (
          <Link to="/admin/morph-ai/limits" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Orqaga
          </Link>
        ) : kind === "queue" ? (
          <Link to="/admin/morph-ai/queue" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Orqaga
          </Link>
        ) : kind === "daily" ? (
          <Link to="/admin/morph-ai/budget" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Orqaga
          </Link>
        ) : kind === "gallery" ? (
          <Link to="/admin/morph-ai/gallery" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Orqaga
          </Link>
        ) : (
          <Link to="/admin/morph-ai" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Orqaga
          </Link>
        )}
        <StatsPageHeader
          title={meta.title}
          description={meta.description}
          rangeKey={meta.usesRange ? rangeKey : undefined}
          onRangeChange={meta.usesRange ? setRangeKey : undefined}
          onExport={async () => {
            await downloadMorphAiListCsv(kind, meta.usesRange ? range : undefined);
          }}
        />
      </div>

      {q.isLoading || !d ? (
        <CardSkeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title="Ma'lumot yo'q" description="Tanlangan filtrda yozuvlar topilmadi." />
      ) : kind === "gallery" ? (
        <div className="space-y-4">
          {d.media_note ? (
            <Alert>
              <AlertTitle>Media</AlertTitle>
              <AlertDescription>{d.media_note}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((item) => {
              const photoMissing = Boolean(item.photo_missing);
              const src = photoMissing ? null : resolveMediaUrl(String(item.photo_url || ""));
              return (
                <figure
                  key={String(item.id)}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
                >
                  <GalleryThumb src={src} alt={String(item.user_name || "")} />
                  <figcaption className="space-y-1 p-3">
                    <div className="truncate text-sm font-medium">{String(item.user_name || "—")}</div>
                    <Badge variant="secondary">{String(item.source || "—")}</Badge>
                    <div className="text-xs text-muted-foreground">
                      {item.created_at
                        ? format(parseISO(String(item.created_at)), "dd.MM.yyyy HH:mm")
                        : "—"}
                    </div>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {kind === "generations" ? (
                    <>
                      <TableHead>Vaqt</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Tur</TableHead>
                      <TableHead>Uslub</TableHead>
                      <TableHead className="text-right">In</TableHead>
                      <TableHead className="text-right">Out</TableHead>
                      <TableHead className="text-right">Token</TableHead>
                      <TableHead className="text-right">Narx</TableHead>
                      <TableHead>Holat</TableHead>
                    </>
                  ) : null}
                  {kind === "spenders" ? (
                    <>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead className="text-right">Generatsiya</TableHead>
                      <TableHead className="text-right">Try-on</TableHead>
                      <TableHead className="text-right">Studio</TableHead>
                      <TableHead className="text-right">Token</TableHead>
                      <TableHead className="text-right">In / Out</TableHead>
                      <TableHead className="text-right">Xarajat</TableHead>
                      <TableHead className="text-right">Oxirgi</TableHead>
                    </>
                  ) : null}
                  {kind === "errors" ? (
                    <>
                      <TableHead>Vaqt</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Tur</TableHead>
                      <TableHead>Xato</TableHead>
                    </>
                  ) : null}
                  {kind === "active-users" ? (
                    <>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Try-on</TableHead>
                      <TableHead className="text-right">Xarajat</TableHead>
                      <TableHead>Flag</TableHead>
                    </>
                  ) : null}
                  {kind === "queue" ? (
                    <>
                      <TableHead>Job</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Uslub</TableHead>
                      <TableHead>Holat</TableHead>
                    </>
                  ) : null}
                  {kind === "daily" ? (
                    <>
                      <TableHead>Sana</TableHead>
                      <TableHead className="text-right">Generatsiya</TableHead>
                      <TableHead className="text-right">Try-on</TableHead>
                      <TableHead className="text-right">Token</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                      <TableHead className="text-right">Userlar</TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {kind === "generations"
                  ? rows.map((row) => (
                      <TableRow key={String(row.id)}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {row.created_at
                            ? format(parseISO(String(row.created_at)), "dd.MM.yyyy HH:mm:ss")
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate font-medium">
                          {String(row.user_name || "—")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{kindLabel(row.kind)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {String(row.style_title || "—")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {formatTokens(row.prompt_tokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {formatTokens(row.candidates_tokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(row.total_tokens)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatUsd(row.cost_usd)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={row.status === "success" ? "default" : "destructive"}
                            className="capitalize"
                          >
                            {row.status === "success" ? "OK" : "Xato"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {kind === "spenders"
                  ? rows.map((u) => (
                      <TableRow key={String(u.user_id)}>
                        <TableCell>
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: String(u.user_id) }}
                            className="font-medium hover:underline"
                          >
                            {String(u.name || "—")}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {String(u.phone || u.email || `ID ${u.user_id}`)}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(u.generations || 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{Number(u.tryon || 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">{Number(u.studio || 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(u.tokens)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {formatTokens(u.prompt_tokens)} / {formatTokens(u.candidates_tokens)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatUsd(u.cost_usd)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {u.last_at ? format(parseISO(String(u.last_at)), "dd.MM HH:mm") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {kind === "errors"
                  ? rows.map((r) => (
                      <TableRow key={String(r.id)}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {r.created_at
                            ? format(parseISO(String(r.created_at)), "dd.MM.yyyy HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell>{String(r.user_name || "—")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{kindLabel(r.kind)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[420px] truncate text-sm">
                          {String(r.error_detail || "—")}
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {kind === "active-users"
                  ? rows.map((u) => (
                      <TableRow key={String(u.user_id)}>
                        <TableCell>
                          <Link
                            to="/admin/users/$userId"
                            params={{ userId: String(u.user_id) }}
                            className="font-medium hover:underline"
                          >
                            {String(u.name || "—")}
                          </Link>
                          <div className="text-xs text-muted-foreground">{String(u.phone || "")}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(u.tryon_today || 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUsd(u.cost_usd)}
                        </TableCell>
                        <TableCell>
                          {u.over_limit ? (
                            <Badge variant="destructive">Limit</Badge>
                          ) : (
                            <Badge variant="outline">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {kind === "queue"
                  ? rows.map((j) => (
                      <TableRow key={String(j.job_id)}>
                        <TableCell className="font-mono text-xs">
                          {String(j.job_id || "").slice(0, 12)}…
                        </TableCell>
                        <TableCell>{j.user_id != null ? String(j.user_id) : "—"}</TableCell>
                        <TableCell>{String(j.style_title || "—")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{String(j.status || "—")}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
                {kind === "daily"
                  ? rows.map((row) => (
                      <TableRow key={String(row.date)}>
                        <TableCell>{String(row.date || "—")}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Number(row.generations || 0)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{Number(row.tryon || 0)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatTokens(row.tokens)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUsd(row.cost_usd)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{Number(row.users || 0)}</TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </div>
          <Pagination
            page={d.page}
            totalPages={d.total_pages}
            count={d.count}
            pageSize={d.page_size}
            onPageChange={(p) =>
              void navigate({
                search: (prev: { page: number }) => ({ ...prev, page: p }),
              })
            }
          />
        </div>
      )}

      {kind === "gallery" && d && rows.length > 0 ? (
        <Pagination
          page={d.page}
          totalPages={d.total_pages}
          count={d.count}
          pageSize={d.page_size}
          onPageChange={(p) =>
            void navigate({
              search: (prev: { page: number }) => ({ ...prev, page: p }),
            })
          }
        />
      ) : null}

      {!q.isLoading && d ? (
        <div className="flex justify-end sm:hidden">
          <ExportButton
            onExport={async () => {
              await downloadMorphAiListCsv(kind, meta.usesRange ? range : undefined);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
