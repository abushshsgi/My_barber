import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { API_BASE, apiFetch, apiJson, formatApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/barber/salon-view/reviews")({
  component: SalonReviewsPage,
});

type SalonReviewRow = {
  id: number;
  author_name?: string;
  rating: number;
  text: string;
  created_at: string;
  barber_reply?: string | null;
  barber_replied_at?: string | null;
  photo?: string | null;
};

function absoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE}${path}`;
}

function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === "object" && Array.isArray((body as { results?: T[] }).results)) {
    return (body as { results: T[] }).results;
  }
  return [];
}

function SalonReviewsPage() {
  const { salon, activeSalonId, isJoinedWorker, ownsSalon } = useBarberContext();
  const salonPk = activeSalonId ?? (salon.id ? Number(salon.id) : null);
  const [rows, setRows] = useState<SalonReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({});
  const [replyingId, setReplyingId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (salonPk == null || !Number.isFinite(salonPk)) {
      setRows([]);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/v1/reviews/?salon=${salonPk}`);
        const raw = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) {
          setError(formatApiError(raw, "Sharhlarni yuklab bo'lmadi."));
          setRows([]);
        } else {
          setRows(unwrapList<SalonReviewRow>(raw));
        }
      } catch {
        if (!alive) return;
        setError("Tarmoq xatosi.");
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [salonPk]);

  async function submitReply(reviewId: number) {
    const text = (replyDraft[reviewId] || "").trim();
    if (!text) return;
    setReplyingId(reviewId);
    try {
      const updated = await apiJson<SalonReviewRow>(`/api/v1/reviews/${reviewId}/reply/`, {
        method: "POST",
        body: JSON.stringify({ reply: text }),
      });
      setRows((prev) => prev.map((r) => (r.id === reviewId ? { ...r, ...updated } : r)));
      setReplyDraft((d) => ({ ...d, [reviewId]: "" }));
      toast.success("Javob saqlandi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xato");
    } finally {
      setReplyingId(null);
    }
  }

  const canOwnerReply = ownsSalon && !isJoinedWorker;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold text-foreground">Salon sharhlari</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {salon.name} bo&apos;yicha mijozlar fikrlari.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-6 shadow-card">
        <div>
          <div className="font-heading text-5xl font-semibold">{salon.rating.toFixed(1)}</div>
          <div className="flex items-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-4",
                  i < Math.round(salon.rating)
                    ? "fill-foreground text-foreground"
                    : "text-muted-foreground/30",
                )}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {salon.reviews_count} sharh (umumiy salon)
          </div>
        </div>
        <div className="flex-1 text-sm text-muted-foreground">
          {isJoinedWorker
            ? "Siz ishchi sifatidasiz — sharhlarni faqat ko‘rishingiz mumkin."
            : "Mijozlar salon va xizmat haqida yozgan sharhlar."}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Yuklanmoqda...
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {!loading && rows.length === 0 && !error && (
          <p className="text-sm text-muted-foreground">
            Hozircha salon bo&apos;yicha sharh yo&apos;q.
          </p>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-xl border border-border bg-card p-5 shadow-card flex gap-3"
          >
            <div className="size-10 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {(r.author_name || "M").slice(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{r.author_name || "Mijoz"}</div>
                <div className="text-xs text-muted-foreground">
                  {r.created_at ? new Date(r.created_at).toLocaleString("uz-UZ") : ""}
                </div>
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-3.5",
                      i < r.rating ? "fill-foreground text-foreground" : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-foreground/90">{r.text}</p>
              {absoluteMediaUrl(r.photo) && (
                <img
                  src={absoluteMediaUrl(r.photo)!}
                  alt=""
                  className="mt-3 max-h-40 rounded-lg object-cover border border-border"
                />
              )}
              {r.barber_reply && (
                <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium text-muted-foreground">Salon javobi: </span>
                  {r.barber_reply}
                </div>
              )}
              {canOwnerReply && !r.barber_reply && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={replyDraft[r.id] || ""}
                    onChange={(e) => setReplyDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                    placeholder="Javob yozing..."
                    className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={replyingId === r.id || !(replyDraft[r.id] || "").trim()}
                    onClick={() => void submitReply(r.id)}
                  >
                    {replyingId === r.id ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin shrink-0" />
                        Jonatish
                      </span>
                    ) : (
                      "Javob berish"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
