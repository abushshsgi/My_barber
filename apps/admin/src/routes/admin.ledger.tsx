import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  Hash,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  fetchLedgerLookup,
  fetchLedgerSuggest,
  type LedgerLookupHit,
  type LedgerLookupSuggestion,
} from "@/lib/admin-api";
import { formatAdminUzs } from "@/lib/admin-analytics";
import { LivePulseBadge } from "@/components/admin/LiveMetricHero";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/ledger")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: AdminLedgerLookupPage,
});

function AdminLedgerLookupPage() {
  const navigate = useNavigate({ from: "/admin/ledger" });
  const { q: qParam } = Route.useSearch();
  const [draft, setDraft] = useState(qParam || "");
  const [activeIdx, setActiveIdx] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    setDraft(qParam || "");
  }, [qParam]);

  const draftTrim = draft.trim();
  const qTrim = (qParam || "").trim();
  const suggestOpen =
    inputFocused && draftTrim.length >= 3 && draftTrim !== qTrim;

  const suggestQ = useQuery({
    queryKey: ["admin", "ledger-suggest", draftTrim],
    queryFn: () => fetchLedgerSuggest(draftTrim),
    enabled: suggestOpen,
    staleTime: 8_000,
  });

  const lookupQ = useQuery({
    queryKey: ["admin", "ledger-lookup", qParam],
    queryFn: () => fetchLedgerLookup(qParam),
    enabled: qTrim.length >= 3,
  });

  const suggestions = suggestOpen ? (suggestQ.data?.suggestions ?? []) : [];
  const hit = lookupQ.data?.results?.[0] as LedgerLookupHit | undefined;
  const allHits = lookupQ.data?.results ?? [];

  const runSearch = (value: string) => {
    const q = value.trim();
    setInputFocused(false);
    setActiveIdx(0);
    void navigate({ search: { q } });
  };

  return (
    <div className="relative mx-auto max-w-[1200px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_oklch(0.92_0.04_250/_0.7),_transparent_70%)]" />

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <LivePulseBadge label="Live lookup" />
          <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
            Hash · Merchant ID · Yozuv ID
          </span>
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          ID / Hash qidiruv
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Chekdagi ID, hash yoki merchant kodini yozing — tizim nima ekanini, kimga tegishli
          ekanini va real ledger zanjirini ko‘rsatadi.
        </p>
      </header>

      <section className="relative z-30 rounded-3xl border border-border bg-card/90 p-4 shadow-card backdrop-blur sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setActiveIdx(0);
                setInputFocused(true);
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => {
                // Allow suggestion click before closing
                window.setTimeout(() => setInputFocused(false), 120);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, Math.max(suggestions.length - 1, 0)));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setInputFocused(false);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const pick = suggestions[activeIdx];
                  runSearch(pick?.value || draft);
                }
              }}
              placeholder="UUID, hash, merchant ID, hamyon raqami…"
              className="h-12 rounded-2xl pl-10 font-mono text-sm"
              autoFocus
              autoComplete="off"
            />
            {suggestions.length > 0 ? (
              <ul className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
                {suggestions.map((s, i) => (
                  <li key={`${s.kind}-${s.value}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => runSearch(s.value)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                        i === activeIdx ? "bg-muted/70" : "hover:bg-muted/40",
                      )}
                    >
                      <SuggestIcon kind={s.kind} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{s.title}</span>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {s.kind_label}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {s.subtitle}
                        </span>
                        <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground/80">
                          {s.value}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Button
            type="button"
            className="h-12 rounded-2xl px-6"
            onClick={() => runSearch(draft)}
            disabled={draft.trim().length < 3}
          >
            Qidirish
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Autocomplete 3 belgidan boshlanadi. Enter — tanlangan taklif yoki to‘liq qidiruv.
        </p>
      </section>

      {lookupQ.isFetching ? (
        <div className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-border py-16 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Zanjir tekshirilmoqda…
        </div>
      ) : null}

      {!lookupQ.isFetching && qParam && lookupQ.data && !lookupQ.data.ok ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-950">
          <p className="font-semibold">Topilmadi</p>
          <p className="mt-1 opacity-90">{lookupQ.data.detail}</p>
        </div>
      ) : null}

      {hit ? (
        <div className="space-y-5">
          <IdentityCard hit={hit} />
          {allHits.length > 1 ? (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Yana {allHits.length - 1} ta moslik
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {allHits.slice(1).map((h) => (
                  <button
                    key={`${h.kind}-${h.primary_id}`}
                    type="button"
                    onClick={() => runSearch(h.primary_id)}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-left text-xs hover:bg-muted/50"
                  >
                    <span className="font-semibold">{h.kind_label}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                      {h.primary_id.slice(0, 18)}…
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {hit.chain ? <ChainPanel chain={hit.chain} title="Asosiy zanjir" /> : null}
          {hit.recipient_chain ? (
            <ChainPanel chain={hit.recipient_chain} title="Qabul qiluvchi zanjiri" />
          ) : null}
        </div>
      ) : !qParam ? (
        <EmptyHints onPick={runSearch} />
      ) : null}
    </div>
  );
}

function SuggestIcon({ kind }: { kind: string }) {
  if (kind.includes("hash")) return <Hash className="mt-0.5 size-4 text-violet-600" />;
  if (kind.includes("gift")) return <Sparkles className="mt-0.5 size-4 text-fuchsia-600" />;
  if (kind.includes("wallet")) return <Wallet className="mt-0.5 size-4 text-emerald-600" />;
  if (kind.includes("merchant") || kind.includes("deposit"))
    return <Fingerprint className="mt-0.5 size-4 text-sky-600" />;
  return <Search className="mt-0.5 size-4 text-muted-foreground" />;
}

function IdentityCard({ hit }: { hit: LedgerLookupHit }) {
  const ownerName =
    hit.owner?.name ||
    hit.owner?.sender?.name ||
    "—";
  const phone = hit.owner?.phone || hit.owner?.sender?.phone;
  const walletNo = hit.owner?.wallet_number || hit.owner?.sender_wallet;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-violet-500/5 shadow-card">
      <div className="border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {hit.kind_label}
            </p>
            <h2 className="mt-1 font-heading text-2xl font-semibold">{hit.title}</h2>
            {hit.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{hit.subtitle}</p>
            ) : null}
          </div>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold">
            moslik: {hit.match_field}
          </span>
        </div>
        <p className="mt-3 rounded-2xl bg-muted/50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {hit.match_explain}
        </p>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <UserRound className="size-3.5" />
            Kimga tegishli
          </p>
          <p className="mt-2 text-base font-semibold">{ownerName}</p>
          {phone ? <p className="text-xs text-muted-foreground">{phone}</p> : null}
          {walletNo ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">{walletNo}</p>
          ) : null}
          {hit.owner?.recipient?.name ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Qabul qiluvchi:{" "}
              <span className="font-semibold text-foreground">{hit.owner.recipient.name}</span>
            </p>
          ) : null}
          {hit.owner?.user_id ? (
            <Link
              to="/admin/users/$userId"
              params={{ userId: String(hit.owner.user_id) }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Profilga o‘tish <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <p className="text-xs font-semibold text-muted-foreground">Identifikatorlar</p>
          <dl className="mt-2 space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Primary ID</dt>
              <dd className="max-w-[65%] break-all text-right font-mono font-medium">
                {hit.primary_id}
              </dd>
            </div>
            {hit.entry?.reference_id ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Merchant ID</dt>
                <dd className="max-w-[65%] break-all text-right font-mono font-medium">
                  {hit.entry.reference_id}
                </dd>
              </div>
            ) : null}
            {hit.entry?.entry_hash ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Hash</dt>
                <dd className="max-w-[65%] break-all text-right font-mono font-medium">
                  {hit.entry.entry_hash.slice(0, 24)}…
                </dd>
              </div>
            ) : null}
            {hit.entry ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Summa</dt>
                <dd className="font-semibold tabular-nums">
                  {formatAdminUzs(hit.entry.amount)}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {(hit.links || []).length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4 sm:px-6">
          {hit.links.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold transition-colors hover:bg-muted"
            >
              {link.label}
              <ArrowRight className="size-3.5" />
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ChainPanel({
  chain,
  title,
}: {
  chain: NonNullable<LedgerLookupHit["chain"]>;
  title: string;
}) {
  const focusIndex = useMemo(
    () => chain.steps.findIndex((s) => s.focus),
    [chain.steps],
  );

  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-heading text-lg font-semibold">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {chain.wallet_number} · {chain.steps_total} ta yozuv
            {chain.truncated ? " (oxirgi 40 ko‘rsatilgan)" : ""}
          </p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
            chain.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {chain.ok ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
          {chain.ok ? "Zanjir OK" : "Zanjir buzilgan"}
        </div>
      </div>

      {!chain.ok && chain.error ? (
        <p className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {chain.error}
        </p>
      ) : null}

      <div className="relative mt-6 space-y-0">
        <div className="absolute bottom-3 left-[19px] top-3 w-px bg-gradient-to-b from-emerald-500/50 via-border to-border" />
        {chain.steps.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              "relative flex gap-4 py-2.5 pl-1 transition-all duration-500",
              step.focus && "scale-[1.01]",
            )}
            style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
          >
            <div
              className={cn(
                "relative z-10 mt-1 grid size-9 shrink-0 place-items-center rounded-full border bg-background shadow-sm",
                step.ok
                  ? "border-emerald-500/40 text-emerald-700"
                  : "border-destructive/40 text-destructive",
                step.focus && "ring-2 ring-violet-500/50 ring-offset-2 ring-offset-background",
              )}
            >
              {step.ok ? (
                <CheckCircle2 className="size-4 animate-[pulse_2.4s_ease-in-out_infinite]" />
              ) : (
                <XCircle className="size-4" />
              )}
            </div>
            <div
              className={cn(
                "min-w-0 flex-1 rounded-2xl border px-3.5 py-3",
                step.focus
                  ? "border-violet-500/40 bg-violet-500/5 shadow-[0_0_0_1px_oklch(0.7_0.12_300/0.15)]"
                  : "border-border bg-background/60",
                !step.ok && "border-destructive/30 bg-destructive/5",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  #{step.index} · {step.entry_type_label}
                  {step.focus ? (
                    <span className="ml-2 rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-800">
                      TOPILDI
                    </span>
                  ) : null}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    step.amount >= 0 ? "text-emerald-700" : "text-muted-foreground",
                  )}
                >
                  {formatAdminUzs(step.amount)}
                </p>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
                <span>hash:{step.entry_hash}</span>
                {step.created_at ? (
                  <span>{format(parseISO(step.created_at), "dd.MM HH:mm:ss")}</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {focusIndex >= 0 ? (
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Diqqat markazi: zanjirning {focusIndex + 1}-bosqichi (binafsha highlight).
        </p>
      ) : null}
    </section>
  );
}

function EmptyHints({ onPick }: { onPick: (v: string) => void }) {
  const samples: LedgerLookupSuggestion[] = [
    {
      kind: "merchant_id",
      kind_label: "Masalan",
      value: "sub-",
      title: "Obuna merchant ID",
      subtitle: "chekdagi Merchant ID (sub-…)",
    },
    {
      kind: "ledger_hash",
      kind_label: "Masalan",
      value: "",
      title: "Hash prefiksi",
      subtitle: "chekdagi Hash dan birinchi 8–16 belgi",
    },
    {
      kind: "gift_transfer",
      kind_label: "Masalan",
      value: "",
      title: "Sovg‘a UUID",
      subtitle: "Sovg‘a oqimidagi merchant TX",
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {samples.map((s) => (
        <button
          key={s.title}
          type="button"
          onClick={() => s.value && onPick(s.value)}
          className="rounded-3xl border border-dashed border-border bg-card/60 p-4 text-left transition-colors hover:border-foreground/30 hover:bg-card"
        >
          <SuggestIcon kind={s.kind} />
          <p className="mt-3 text-sm font-semibold">{s.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{s.subtitle}</p>
        </button>
      ))}
    </div>
  );
}
