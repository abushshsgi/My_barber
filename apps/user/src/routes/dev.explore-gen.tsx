import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Globe, ImageIcon, Loader2, Lock, RefreshCw, Sparkles, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";

import {
  EXPLORE_PERSONAS,
  MEN_CATALOG_STYLE_SLUGS,
  type ExplorePersonaId,
} from "@/lib/explore-personas";
import {
  downloadExploreGenAsset,
  exploreGenDownloadFilename,
  fetchExploreGenStatus,
  generateExploreAsset,
  publishExploreAsset,
  publishExplorePersona,
  readExploreGenSecret,
  resolveExploreGenImageUrl,
  saveExploreGenSecret,
  type ExploreGenJob,
} from "@/lib/api/explore-gen";
import { cn } from "@/lib/utils";

type ExploreGenSearch = {
  key?: string;
};

export const Route = createFileRoute("/dev/explore-gen")({
  validateSearch: (search: Record<string, unknown>): ExploreGenSearch => ({
    key: typeof search.key === "string" ? search.key : undefined,
  }),
  head: () => ({ meta: [{ title: "Explore generatsiya — mysaloon.uz" }] }),
  component: ExploreGenDevPage,
});

type QueueItem = { personaId: string; slug: string; force: boolean };

const QUEUE_GAP_MS = 12_000;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
const MAX_QUEUE_RETRIES = 8;

function isRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes("limit") || msg.includes("band") || msg.includes("429");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function ExploreGenDevPage() {
  const { key: urlKey } = Route.useSearch();
  const queryClient = useQueryClient();
  const isDev = import.meta.env.DEV;
  const [personaId, setPersonaId] = useState<ExplorePersonaId>("britan");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [unlocked, setUnlocked] = useState(isDev);

  useEffect(() => {
    if (urlKey) {
      saveExploreGenSecret(urlKey);
      setUnlocked(true);
    } else if (readExploreGenSecret()) {
      setUnlocked(true);
    }
  }, [urlKey]);

  const statusQuery = useQuery({
    queryKey: ["explore-gen-status", unlocked],
    queryFn: fetchExploreGenStatus,
    enabled: unlocked,
    refetchInterval: running ? false : 30_000,
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: generateExploreAsset,
    onSuccess: (result) => {
      if (result.status === "skipped") {
        toast.message(result.message ?? "O'tkazib yuborildi");
      } else {
        toast.success(`${result.slug} yaratildi (${result.method ?? "ai"})`);
      }
      void queryClient.invalidateQueries({ queryKey: ["explore-gen-status"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Generatsiya xato");
    },
  });

  const publishMutation = useMutation({
    mutationFn: publishExploreAsset,
    onSuccess: (result) => {
      toast.success(`${result.slug} Explore'da jonli`);
      void queryClient.invalidateQueries({ queryKey: ["explore-gen-status"] });
      void queryClient.invalidateQueries({ queryKey: ["explore-personas"] });
      void queryClient.invalidateQueries({ queryKey: ["hairstyles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Joylashtirish xato");
    },
  });

  const publishPersonaMutation = useMutation({
    mutationFn: publishExplorePersona,
    onSuccess: (result) => {
      toast.success(`${result.persona_id}: ${result.count} ta Explore'ga joylandi`);
      void queryClient.invalidateQueries({ queryKey: ["explore-gen-status"] });
      void queryClient.invalidateQueries({ queryKey: ["explore-personas"] });
      void queryClient.invalidateQueries({ queryKey: ["hairstyles"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Joylashtirish xato");
    },
  });

  const jobs = statusQuery.data?.jobs ?? [];
  const configured = statusQuery.data?.configured;
  const outputMode = statusQuery.data?.output_mode ?? "media";

  const personaJobs = useMemo(
    () => jobs.filter((job) => job.persona_id === personaId),
    [jobs, personaId],
  );

  const runQueue = useCallback(
    async (items: QueueItem[]) => {
      if (!items.length || running) return;
      setRunning(true);
      setQueue(items);
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        setQueue(items.slice(i));
        let retries = 0;
        while (retries <= MAX_QUEUE_RETRIES) {
          try {
            await generateMutation.mutateAsync({
              personaId: item.personaId,
              slug: item.slug,
              force: item.force,
            });
            break;
          } catch (error) {
            if (isRateLimitError(error) && retries < MAX_QUEUE_RETRIES) {
              retries += 1;
              toast.message(`Limit — ${Math.round(RATE_LIMIT_COOLDOWN_MS / 1000)}s kutamiz (${retries}/${MAX_QUEUE_RETRIES})…`);
              await sleep(RATE_LIMIT_COOLDOWN_MS);
              continue;
            }
            setQueue([]);
            setRunning(false);
            return;
          }
        }
        if (i < items.length - 1) {
          await sleep(QUEUE_GAP_MS);
        }
      }
      setQueue([]);
      setRunning(false);
    },
    [generateMutation, running],
  );

  const enqueuePersona = (force: boolean, onlyMissing: boolean) => {
    const items: QueueItem[] = [];
    const ref = personaJobs.find((job) => job.slug === "reference");
    if (ref && (!onlyMissing || !ref.exists || force)) {
      items.push({ personaId, slug: "reference", force });
    }
    for (const slug of MEN_CATALOG_STYLE_SLUGS) {
      const job = personaJobs.find((entry) => entry.slug === slug);
      if (!job) continue;
      if (onlyMissing && job.exists && !force) continue;
      items.push({ personaId, slug, force });
    }
    void runQueue(items);
  };

  const enqueueAllMissing = () => {
    const items: QueueItem[] = jobs
      .filter((job) => !job.exists)
      .map((job) => ({ personaId: job.persona_id, slug: job.slug, force: false }));
    void runQueue(items);
  };

  const handleUnlock = () => {
    if (!keyInput.trim()) return;
    saveExploreGenSecret(keyInput.trim());
    setUnlocked(true);
    void queryClient.invalidateQueries({ queryKey: ["explore-gen-status"] });
  };

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="size-5 text-neutral-700" />
            <h1 className="text-lg font-bold">Explore generatsiya</h1>
          </div>
          <p className="mt-3 text-sm text-neutral-600">
            Maxfiy kalit kiriting yoki havolada{" "}
            <code className="rounded bg-neutral-100 px-1">?key=...</code> bilan kiring.
          </p>
          <input
            type="password"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="EXPLORE_GEN_SECRET"
            className="mt-4 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
          />
          <button
            type="button"
            onClick={handleUnlock}
            className="mt-3 w-full rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white"
          >
            Kirish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-8 text-neutral-900">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                Vaqtinchalik
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">Explore rasm generatsiyasi</h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                4 personaj × reference + 12 uslub. Avval <strong>reference</strong>, keyin uslublar —
                har biri shu portretdan edit + katalog uslub namunasi (Explore bilan bir xil uslub).
              </p>
            </div>
            <button
              type="button"
              onClick={() => void statusQuery.refetch()}
              disabled={statusQuery.isFetching}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold hover:bg-neutral-50"
            >
              {statusQuery.isFetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Yangilash
            </button>
          </div>

          {outputMode === "media" ? (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <strong>Production (Railway):</strong> rasmlar server media papkasiga saqlanadi.
              Tayyor bo&apos;lgach <strong>Explore&apos;ga joylash</strong> tugmasini bosing — foydalanuvchilar
              shu trumakni tanlaganda haqiqiy Explore&apos;da ko&apos;radi. Yuklab olish ixtiyoriy (
              <code className="rounded bg-white/80 px-1">persona-uslub.webp</code>).
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Yuklab olish nomi: <code className="rounded bg-white/80 px-1">persona-uslub.webp</code>{" "}
              (masalan <code className="rounded bg-white/80 px-1">britan-reference.webp</code>).
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <ConfigBadge
              ok={configured?.studio_image}
              label={
                configured?.provider === "studio"
                  ? "AI Studio API (GEMINI_API_KEY)"
                  : "Gemini rasm (Vertex zaxira)"
              }
            />
            {configured?.provider ? (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
                provider: {configured.provider}
              </span>
            ) : null}
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
              {statusQuery.data?.existing ?? 0} / {statusQuery.data?.total ?? 52} tayyor
            </span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700">
              output: {outputMode}
            </span>
          </div>

          {!configured?.studio_image ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Railway Variables ga <strong>GEMINI_API_KEY</strong> qo&apos;ying (
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                aistudio.google.com/apikey
              </a>
              ). Model: <strong>gemini-3.1-flash-lite-image</strong>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {EXPLORE_PERSONAS.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => setPersonaId(persona.id)}
                className={cn(
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                  personaId === persona.id
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
                )}
              >
                {persona.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <ActionButton
              icon={Sparkles}
              label="Reference generatsiya"
              disabled={running}
              onClick={() => void runQueue([{ personaId, slug: "reference", force: true }])}
            />
            <ActionButton
              icon={Wand2}
              label="Personaj — yo'q bo'lganlar"
              disabled={running}
              onClick={() => enqueuePersona(false, true)}
            />
            <ActionButton
              icon={RefreshCw}
              label="Personaj — hammasi (force)"
              disabled={running}
              onClick={() => enqueuePersona(true, false)}
            />
            <ActionButton
              icon={ImageIcon}
              label="Barcha yo'q bo'lganlar"
              disabled={running}
              onClick={enqueueAllMissing}
            />
            <ActionButton
              icon={Upload}
              label="Personaj — Explore'ga joylash"
              disabled={running || publishPersonaMutation.isPending}
              onClick={() => publishPersonaMutation.mutate({ personaId })}
            />
          </div>

          {running ? (
            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              Navbat: {queue.length} ta qoldi
              {queue[0] ? ` — hozir: ${queue[0].personaId} / ${queue[0].slug}` : ""}
            </div>
          ) : null}
        </div>

        {statusQuery.isError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            API xato — kalit noto&apos;g&apos;ri yoki backend sozlanmagan. Lokalda{" "}
            <code>DEBUG=true</code>, productionda <code>EXPLORE_GEN_SECRET</code> va Vertex
            sozlamalarini tekshiring.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {personaJobs.map((job) => (
            <JobCard
              key={`${job.persona_id}-${job.slug}`}
              job={job}
              busy={running || generateMutation.isPending || publishMutation.isPending}
              publishing={publishMutation.isPending}
              expanded={expandedPrompt === `${job.persona_id}-${job.slug}`}
              onTogglePrompt={() =>
                setExpandedPrompt((current) =>
                  current === `${job.persona_id}-${job.slug}`
                    ? null
                    : `${job.persona_id}-${job.slug}`,
                )
              }
              onGenerate={(force) =>
                void runQueue([{ personaId: job.persona_id, slug: job.slug, force }])
              }
              onPublish={() => publishMutation.mutate({ personaId: job.persona_id, slug: job.slug })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigBadge({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
      )}
    >
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: typeof Sparkles;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function JobCard({
  job,
  busy,
  publishing,
  expanded,
  onTogglePrompt,
  onGenerate,
  onPublish,
}: {
  job: ExploreGenJob;
  busy: boolean;
  publishing: boolean;
  expanded: boolean;
  onTogglePrompt: () => void;
  onGenerate: (force: boolean) => void;
  onPublish: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const imageUrl = resolveExploreGenImageUrl(job);
  const downloadName = exploreGenDownloadFilename(job);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadExploreGenAsset(job);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yuklab olishda xatolik");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[3/4] bg-neutral-100">
        {job.exists && imageUrl ? (
          <img
            src={`${imageUrl}${imageUrl.includes("?") ? "&" : "?"}t=${job.slug}`}
            alt={`${job.persona_label} ${job.slug}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
            <ImageIcon className="size-8" />
            <span className="text-xs font-semibold uppercase tracking-wide">Yo&apos;q</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {job.kind === "reference" ? "Reference" : job.slug}
        </span>
        {job.published ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <Globe className="size-3" />
            Live
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="text-sm font-bold">{job.persona_label}</p>
          <p className="text-xs text-neutral-500">{downloadName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onGenerate(false)}
            className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            Generatsiya
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onGenerate(true)}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Qayta
          </button>
          {job.exists ? (
            <>
              <button
                type="button"
                disabled={busy || downloading}
                onClick={() => void handleDownload()}
                className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
                Yuklab olish
              </button>
              {!job.published ? (
                <button
                  type="button"
                  disabled={busy || publishing}
                  onClick={onPublish}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {publishing ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  Explore&apos;ga
                </button>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            onClick={onTogglePrompt}
            className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold"
          >
            Prompt
          </button>
        </div>
        {expanded ? (
          <pre className="max-h-40 overflow-auto rounded-xl bg-neutral-50 p-3 text-[10px] leading-relaxed text-neutral-700">
            {job.prompt}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
