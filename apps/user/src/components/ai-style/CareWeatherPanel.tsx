import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronLeft, Droplets, Loader2, LocateFixed, Sun, Wind } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  fetchWeatherShieldCatalog,
  postWeatherShieldAction,
  type MyCareProduct,
  type WeatherCareSnapshot,
  type WeatherShieldRec,
} from "@/lib/api/care-products";
import { buildGoOutKit, buildGoOutSummary, shieldImageForTag, weatherHeroFallback } from "@/lib/care-go-out";
import { resolveMediaUrl } from "@/lib/media-url";
import { regionLabel, resolveUzRegion, UZ_REGION_OPTIONS, uzRegionImage, type UzRegionId } from "@/lib/uz-care-regions";
import { cn } from "@/lib/utils";

const CONDITIONS: Record<string, string> = {
  clear: "Ochiq",
  mainly_clear: "Ochiq",
  partly_cloudy: "Qisman bulutli",
  overcast: "Bulutli",
  cloudy: "Bulutli",
  fog: "Tuman",
  drizzle: "Mayda yomg‘ir",
  rain: "Yomg‘ir",
  showers: "Jala",
  snow: "Qor",
  storm: "Momaqaldiroq",
  unknown: "Ob-havo",
};

function typeLabel(type: string) {
  if (type === "routine") return "Rejim";
  if (type === "product") return "Mahsulot";
  return "Maslahat";
}

export function CareWeatherPanel({
  weather,
  loading,
  error,
  onRetry,
  regionId,
  onRegion,
  onBack,
  hairCondition,
  myProducts,
}: {
  weather?: WeatherCareSnapshot;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  regionId: UzRegionId | null;
  onRegion: (id: UzRegionId | null) => void;
  onBack: () => void;
  hairCondition?: string;
  myProducts: MyCareProduct[];
}) {
  const current = weather?.current;
  const conditionKey = current?.condition_key || "unknown";
  const uvIndex = weather?.uv?.index ?? current?.uv_index ?? null;
  const [regionOpen, setRegionOpen] = useState(false);
  const [goOutOpen, setGoOutOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());

  const resolvedRegion =
    regionId ||
    weather?.region_id ||
    resolveUzRegion({
      region: weather?.location_region,
      place: weather?.location_place || weather?.location_label,
      lat: weather?.latitude,
      lon: weather?.longitude,
    });
  const hero = uzRegionImage(resolvedRegion) || weatherHeroFallback(conditionKey);
  const city = regionId ? regionLabel(regionId) : regionLabel(resolvedRegion);

  const shieldQ = useQuery({
    queryKey: ["ai", "care", "weather-shield", current?.temperature_c, current?.humidity_pct, uvIndex, current?.wind_kmh, conditionKey, hairCondition || ""],
    enabled: Boolean(current),
    staleTime: 5 * 60_000,
    queryFn: () =>
      fetchWeatherShieldCatalog({
        temp: current?.temperature_c,
        humidity: current?.humidity_pct,
        uv: uvIndex,
        wind: current?.wind_kmh,
        condition: conditionKey,
        hair_condition: hairCondition,
      }),
  });

  useEffect(() => {
    if (shieldQ.data?.done_ids) setDone(new Set(shieldQ.data.done_ids));
  }, [shieldQ.data]);

  const recs = (shieldQ.data?.recommendations || []).filter((row) => row.type !== "style");
  const featured = recs[0];
  const tiles = recs.slice(1, 5);
  const steps = recs.slice(5);
  const alert = shieldQ.data?.alerts?.[0];
  const doneCount = recs.filter((row) => done.has(row.id)).length;
  const ctx = {
    condition: conditionKey,
    temp: current?.temperature_c ?? null,
    humidity: current?.humidity_pct ?? null,
    wind: current?.wind_kmh ?? null,
  };
  const summary = useMemo(() => (current ? buildGoOutSummary(ctx) : ""), [current, conditionKey, current?.temperature_c, current?.humidity_pct, current?.wind_kmh]);
  const kit = useMemo(
    () => buildGoOutKit({ ...ctx, uvIndex, myProducts }),
    [conditionKey, current?.temperature_c, current?.humidity_pct, current?.wind_kmh, uvIndex, myProducts],
  );

  const toggle = (item: WeatherShieldRec) => {
    const completed = !done.has(item.id);
    setDone((prev) => {
      const next = new Set(prev);
      if (completed) next.add(item.id);
      else next.delete(item.id);
      return next;
    });
    if (completed) {
      setToast(true);
      window.setTimeout(() => setToast(false), 1800);
    }
    void postWeatherShieldAction({
      id: item.id,
      completed,
      weather_snapshot: {
        temp: current?.temperature_c,
        humidity: current?.humidity_pct,
        uv: uvIndex,
        condition: conditionKey,
      },
    }).catch(() => undefined);
  };

  return (
    <div className="-mx-4 lg:mx-0">
      {toast ? (
        <div className="fixed left-4 right-4 top-3 z-50 mx-auto flex max-w-sm items-center gap-2 rounded-2xl bg-[#16A34A] px-3 py-2.5 text-sm font-semibold text-white shadow-lg">
          <span className="grid size-6 place-items-center rounded-full bg-white/20">
            <Check className="size-3.5" />
          </span>
          Yaxshi bajardingiz!
        </div>
      ) : null}

      <div className="relative h-[280px] overflow-hidden text-white lg:h-[340px] lg:rounded-3xl">
        <img src={hero} alt="" className="absolute inset-0 size-full object-cover object-right" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/25" />
        <button
          type="button"
          onClick={onBack}
          className="absolute left-4 top-3 grid size-11 cursor-pointer place-items-center rounded-2xl bg-white text-[#111] shadow-sm"
          aria-label="Orqaga"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setRegionOpen(true)}
          className="absolute right-4 top-3 inline-flex max-w-[11rem] cursor-pointer items-center gap-1 rounded-full bg-white px-3 py-2 text-[13px] font-semibold text-[#111]"
        >
          <span className="truncate">{city}</span>
          <ChevronDown className="size-3.5 shrink-0" />
        </button>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-5">
          {loading && !weather ? (
            <Loader2 className="size-6 animate-spin" />
          ) : error && !weather ? (
            <button type="button" onClick={onRetry} className="cursor-pointer text-sm font-semibold">
              {error} · Qayta urinish
            </button>
          ) : (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/80">Ob-havo</p>
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-6xl font-bold leading-none tabular-nums">
                  {current?.temperature_c == null ? "—" : `${Math.round(current.temperature_c)}°`}
                </p>
                <p className="mb-1 max-w-[9rem] text-right text-sm font-semibold leading-snug">
                  {CONDITIONS[conditionKey] || "Ob-havo"}
                </p>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[13px] font-semibold">
                <span className="inline-flex items-center gap-1">
                  <Droplets className="size-3.5" />
                  {current?.humidity_pct == null ? "—" : `${Math.round(current.humidity_pct)}%`}
                </span>
                <span className="h-3 w-px bg-white/40" />
                <span className="inline-flex items-center gap-1">
                  <Wind className="size-3.5" />
                  {current?.wind_kmh == null ? "—" : `${Math.round(current.wind_kmh)} km/h`}
                </span>
                {uvIndex != null ? (
                  <>
                    <span className="h-3 w-px bg-white/40" />
                    <span className="inline-flex items-center gap-1">
                      <Sun className="size-3.5" />
                      UV {Math.round(uvIndex)}
                    </span>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {weather ? (
        <div className="rounded-t-3xl bg-[#F6F6F7] px-4 pb-8 pt-4 lg:mt-6 lg:rounded-3xl lg:bg-transparent lg:px-0 lg:pt-0">
          <div className="flex items-center gap-3 lg:rounded-3xl lg:bg-white lg:px-4 lg:py-3 lg:ring-1 lg:ring-black/5">
            <p className="min-w-0 flex-1 text-sm leading-snug text-[#111]/70">{summary}</p>
            <button
              type="button"
              onClick={() => setGoOutOpen(true)}
              className="relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-white ring-1 ring-black/10"
              aria-label="Uydan chiqishda oling"
            >
              <img src={kit[0]?.image || "/care/go-out/sunglasses.png"} alt="" className="size-full object-cover" />
            </button>
          </div>

          {(weather.primary_action?.title || (weather.recommendations || []).length > 0) ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              {weather.primary_action?.title ? (
                <div className="rounded-3xl bg-white px-4 py-4 ring-1 ring-black/5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#111]/40">
                    Soch holatingizga mos
                  </p>
                  <p className="mt-1 text-base font-extrabold">{weather.primary_action.title}</p>
                  {weather.primary_action.subtitle ? (
                    <p className="mt-1 text-sm leading-relaxed text-[#111]/60">
                      {weather.primary_action.subtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {(weather.recommendations || []).length > 0 ? (
                <div className="rounded-3xl bg-white px-4 py-4 ring-1 ring-black/5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#111]/40">Tavsiyalar</p>
                  <ul className="mt-2 space-y-2">
                    {(weather.recommendations || []).map((tip) => (
                      <li key={tip} className="text-sm leading-relaxed text-[#111]/75">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5">
            <div className="flex items-start gap-3">
              <img src="/care/weather-shield/header-shield.png" alt="" className="size-12 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#111]/40">Morf Shield · Bugun</p>
                <p className="text-base font-extrabold tracking-tight">Soch himoyasi</p>
                <p className="text-[12px] text-[#111]/45">Har kuni belgilang — ertaga yangilanadi</p>
              </div>
              <div className="text-right">
                {alert ? (
                  <p className="max-w-[7rem] truncate rounded-full bg-white px-2 py-1 text-[11px] font-semibold ring-1 ring-black/10">
                    {alert.label}
                  </p>
                ) : null}
                {recs.length > 0 ? (
                  <p className="mt-1 text-sm font-bold tabular-nums">
                    {doneCount}/{recs.length}
                  </p>
                ) : null}
              </div>
            </div>

            {shieldQ.isLoading ? (
              <div className="mt-6 grid place-items-center">
                <Loader2 className="size-5 animate-spin text-[#111]/40" />
              </div>
            ) : recs.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5">
                <p className="text-sm font-bold">Maxsus himoya kerak emas</p>
                <p className="mt-1 text-sm text-[#111]/55">
                  Bugun ob-havo yumshoq — oddiy yuvish va yengil namlantirish yetarli.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {featured ? <ShieldCard item={featured} index={0} done={done.has(featured.id)} onToggle={() => toggle(featured)} variant="featured" /> : null}
                {tiles.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {tiles.map((item, index) => (
                      <ShieldCard key={item.id} item={item} index={index + 1} done={done.has(item.id)} onToggle={() => toggle(item)} variant="tile" />
                    ))}
                  </div>
                ) : null}
                {steps.map((item, index) => (
                  <ShieldCard key={item.id} item={item} index={index + 5} done={done.has(item.id)} onToggle={() => toggle(item)} variant="step" />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {regionOpen ? (
        <Sheet onClose={() => setRegionOpen(false)} title="Viloyatni tanlang" sub="GPS noto‘g‘ri bo‘lsa — qo‘lda tanlang">
          <div className="max-h-[50vh] space-y-1 overflow-y-auto">
            {UZ_REGION_OPTIONS.map((row) => {
              const on = regionId === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    onRegion(row.id);
                    setRegionOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-semibold",
                    on ? "bg-[#111] text-white" : "bg-white",
                  )}
                >
                  {row.label}
                  {on ? <Check className="size-4" /> : null}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              onRegion(null);
              setRegionOpen(false);
            }}
            className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold ring-1 ring-black/10"
          >
            <LocateFixed className="size-4" />
            GPS joylashuvini ishlatish
          </button>
        </Sheet>
      ) : null}

      {goOutOpen ? (
        <Sheet onClose={() => setGoOutOpen(false)} title="Uydan chiqishda oling" sub={summary}>
          <div className="grid max-h-[62vh] grid-cols-2 gap-2 overflow-y-auto">
            {kit.map((item) => (
              <div key={item.id} className="rounded-2xl bg-white p-2 ring-1 ring-black/5">
                <img src={resolveMediaUrl(item.image) || item.image} alt="" className="h-24 w-full rounded-xl object-contain" />
                <p className="mt-2 line-clamp-2 text-[13px] font-bold">{item.title}</p>
                {item.fromMyProduct ? <p className="text-[10px] font-semibold text-[#111]/45">Mening mahsulotim</p> : null}
                <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-[#111]/55">{item.howToUse}</p>
              </div>
            ))}
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

function ShieldCard({
  item,
  index,
  done,
  onToggle,
  variant,
}: {
  item: WeatherShieldRec;
  index: number;
  done: boolean;
  onToggle: () => void;
  variant: "featured" | "tile" | "step";
}) {
  const image = item.image_url ? resolveMediaUrl(item.image_url) || item.image_url : shieldImageForTag(item.productTag, item.id);
  const step = String(index + 1).padStart(2, "0");
  if (variant === "tile") {
    return (
      <div className={cn("rounded-2xl bg-white p-2 ring-1 ring-black/5", done && "opacity-55")}>
        <div className="relative h-24 rounded-xl bg-[#F3F3F4]">
          <img src={image} alt="" className="size-full object-contain" />
          <button type="button" onClick={onToggle} className="absolute right-1.5 top-1.5 cursor-pointer" aria-label="Bajarildi">
            <CheckMark on={done} />
          </button>
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase text-[#111]/35">{typeLabel(item.type)}</p>
        <p className="line-clamp-2 text-[13px] font-bold">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-[#111]/50">{item.description}</p>
      </div>
    );
  }
  if (variant === "step") {
    return (
      <div className={cn("flex items-center gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-black/5", done && "opacity-55")}>
        <button type="button" onClick={onToggle} className="cursor-pointer" aria-label="Bajarildi">
          <CheckMark on={done} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold text-[#111]/35">
            {step} · {typeLabel(item.type)}
          </p>
          <p className="truncate text-[13px] font-bold">{item.title}</p>
          <p className="line-clamp-2 text-[11px] text-[#111]/50">{item.description}</p>
        </div>
        <img src={image} alt="" className="size-12 rounded-xl object-contain" />
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl bg-white p-2.5 ring-1 ring-black/5", done && "opacity-55")}>
      <img src={image} alt="" className="size-20 rounded-2xl object-contain" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-[#111]/35">
          {step} · {typeLabel(item.type)}
        </p>
        <p className="truncate text-sm font-bold">{item.title}</p>
        <p className="mt-0.5 line-clamp-2 text-[12px] text-[#111]/55">{item.description}</p>
      </div>
      <button type="button" onClick={onToggle} className="cursor-pointer" aria-label="Bajarildi">
        <CheckMark on={done} />
      </button>
    </div>
  );
}

function CheckMark({ on }: { on: boolean }) {
  return (
    <span className={cn("grid size-6 place-items-center rounded-full border-[1.5px] border-black/20 bg-white", on && "border-[#16A34A] bg-[#16A34A] text-white")}>
      {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
    </span>
  );
}

function Sheet({
  title,
  sub,
  onClose,
  children,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Yopish" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-3xl bg-[#F6F6F7] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
        <p className="text-base font-extrabold">{title}</p>
        {sub ? <p className="mt-1 text-sm text-[#111]/55">{sub}</p> : null}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
