import { useNavigate, useRouter } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { navigateBack } from "@/lib/mobile-back";
import { CareAiRoutine } from "@/components/ai-style/CareAiRoutine";
import { CareHubCardArt, CareQuickArt } from "@/components/ai-style/CareHubArt";
import { CareWeatherPanel } from "@/components/ai-style/CareWeatherPanel";
import { HairConditionAsk } from "@/components/ai-style/HairConditionAsk";
import { MorphLimitUpsell } from "@/components/ai-style/MorphLimitUpsell";
import {
  buildCarePlan,
  saveCareQuiz,
  type CareQuizAnswers,
  type ColorStatus,
  type HairCondition,
  type HairTexture,
} from "@/lib/morf-ai-care";
import { loadFaceProfile } from "@/lib/face-profile";
import { hasValidUserSession } from "@/lib/api/client";
import { fetchCareAccess } from "@/lib/api/subscriptions";
import { useSubscriptionMe } from "@/hooks/use-subscription";
import { cn } from "@/lib/utils";
import { useHairCareProfile } from "@/hooks/use-hair-care-profile";
import { useCareProducts } from "@/hooks/use-care-products";
import { BadHairDaySosSheet } from "@/components/ai-style/BadHairDaySosSheet";
import { CareShelfTracker } from "@/components/ai-style/CareShelfTracker";
import {
  addMyCareProduct,
  fetchMyCareProducts,
  fetchWeatherCare,
  toggleCareProductLike,
  type CareProduct,
} from "@/lib/api/care-products";
import { getFastPosition } from "@/lib/native-geolocation";
import { resolveUzRegion, uzRegionImage, type UzRegionId } from "@/lib/uz-care-regions";

export function MorphAiCarePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();
  const accessQ = useQuery({
    queryKey: ["subscriptions", "care-access"],
    queryFn: fetchCareAccess,
    staleTime: 30_000,
  });
  const hairQ = useHairCareProfile();
  const catalogQ = useCareProducts({ recommended: true });
  const profile = useMemo(() => loadFaceProfile(), []);
  const [quiz, setQuiz] = useState<CareQuizAnswers>({
    condition: "",
    texture: "",
    colorStatus: "",
  });
  const [forceQuiz, setForceQuiz] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem("mysaloon.care.retake") === "1";
  });
  const [panel, setPanel] = useState<"hub" | "routine" | "shelf" | "weather" | "growth" | "mine">("hub");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [busyProductId, setBusyProductId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [regionId, setRegionId] = useState<UzRegionId | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallPrefer, setPaywallPrefer] = useState<"plus" | "pro">("plus");
  const meQ = useSubscriptionMe();
  const searchQ = useCareProducts({
    q: search.trim() || undefined,
    enabled: search.trim().length > 0,
  });
  const weatherQ = useQuery({
    queryKey: [
      "ai",
      "care",
      "weather",
      hairQ.data?.condition,
      hairQ.data?.texture,
      coords?.lat ?? null,
      coords?.lon ?? null,
      regionId,
    ],
    queryFn: () =>
      fetchWeatherCare({
        condition: hairQ.data?.condition || undefined,
        texture: hairQ.data?.texture || undefined,
        lat: regionId ? undefined : coords?.lat,
        lon: regionId ? undefined : coords?.lon,
        region_id: regionId || undefined,
      }),
    enabled: Boolean(hairQ.data?.complete),
    staleTime: 10 * 60_000,
  });
  const myQ = useQuery({
    queryKey: ["ai", "care", "my-products"],
    queryFn: fetchMyCareProducts,
    enabled: Boolean(hairQ.data?.complete),
    staleTime: 20_000,
  });
  const plan = useMemo(
    () =>
      buildCarePlan(
        profile,
        hairQ.data?.complete
          ? {
              condition: hairQ.data.condition as HairCondition,
              texture: hairQ.data.texture as HairTexture,
              colorStatus: hairQ.data.color_status as ColorStatus,
            }
          : quiz,
      ),
    [profile, quiz, hairQ.data],
  );
  const catalogProducts = catalogQ.data || [];
  const hydratedHair = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("care-weather-region");
      if (saved) setRegionId(saved as UzRegionId);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancel = false;
    void getFastPosition({ timeout: 8000, maximumAge: 120_000 })
      .then((pos) => {
        if (!cancel) setCoords({ lat: pos.lat, lon: pos.lng });
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!forceQuiz) return;
    sessionStorage.removeItem("mysaloon.care.retake");
    setQuiz({ condition: "", texture: "", colorStatus: "" });
  }, [forceQuiz]);

  useEffect(() => {
    if (forceQuiz || hydratedHair.current || !hairQ.data?.complete) return;
    hydratedHair.current = true;
    const next: CareQuizAnswers = {
      condition: hairQ.data.condition as HairCondition,
      texture: hairQ.data.texture as HairTexture,
      colorStatus: hairQ.data.color_status as ColorStatus,
    };
    setQuiz(next);
    saveCareQuiz(next);
  }, [hairQ.data, forceQuiz]);

  const openPaywall = (prefer: "plus" | "pro" = "plus") => {
    setPaywallPrefer(prefer);
    setPaywallOpen(true);
  };
  const needPlus = () => {
    if (accessQ.isLoading) return true;
    if (accessQ.data?.allowed) return false;
    openPaywall("plus");
    return true;
  };
  const needPro = () => {
    if (accessQ.isLoading) return true;
    if (accessQ.data?.pro_allowed) return false;
    openPaywall("pro");
    return true;
  };

  if (hairQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#FAFAFA] text-[#111111]">
        <Loader2 className="size-6 animate-spin text-[#111111]/40" />
      </div>
    );
  }

  const likeProduct = async (productId: number) => {
    try {
      const res = await toggleCareProductLike(productId);
      qc.setQueryData<CareProduct[]>(["ai", "care", "products", "", "", "rec"], (prev) =>
        prev?.map((row) =>
          row.id === productId
            ? { ...row, liked_by_me: res.liked, likes_count: res.likes_count }
            : row,
        ),
      );
    } catch {
      /* like qaytariladi — ro‘yxat keyingi yangilanishda to‘g‘rilanadi */
    }
  };

  const addProduct = async (productId: number) => {
    if (busyProductId) return;
    setBusyProductId(productId);
    try {
      await addMyCareProduct({ product_id: productId, source: "recommended" });
      await qc.invalidateQueries({ queryKey: ["ai", "care", "my-products"] });
    } finally {
      setBusyProductId(null);
    }
  };

  if (!hairQ.data?.complete || forceQuiz) {
    if (!hasValidUserSession()) {
      return (
        <div className="grid min-h-[100dvh] place-items-center bg-[#FAFAFA] px-6 text-center text-[#111111]">
          <div className="max-w-sm">
            <h1 className="text-xl font-semibold tracking-tight">Avval hisobingizga kiring</h1>
            <p className="mt-2 text-sm leading-relaxed text-[#111111]/55">
              Soch holati shu hisobga saqlanadi. Parvarish va chatbot shundan keyin ochiladi.
            </p>
            <button
              type="button"
              onClick={() =>
                void navigate({ to: "/auth", search: { redirect: "/ai-style/care" } })
              }
              className="mt-6 h-12 cursor-pointer rounded-full bg-[#111111] px-6 text-sm font-semibold text-white"
            >
              Kirish
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] bg-[#FAFAFA] text-[#111111]">
        <div
          className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between">
            <BackLink label={t("common.back")} />
            <span className="text-[13px] font-semibold text-[#111111]/55">
              {t("aiStylePage.care.onboarding.badge", { defaultValue: "Soch tahlili" })}
            </span>
            <span className="size-11" />
          </div>
          <div className="mt-8 flex-1">
            <HairConditionAsk
              lead={t("aiStylePage.chat.hairAsk.lead", {
                defaultValue:
                  "Morf AI chatbot yaxshi ishlashi uchun o‘zingizning soch holatingizni kiriting.",
              })}
              onDone={(answers) => {
                setQuiz({
                  condition: answers.condition,
                  texture: answers.texture,
                  colorStatus: answers.color_status,
                });
                setForceQuiz(false);
              }}
            />
          </div>
        </div>
      </div>
    );
  }


  const weather = weatherQ.data;
  const weatherKey = weather?.current?.condition_key || "unknown";
  const weatherName =
    {
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
    }[weatherKey] || "Ob-havo";
  const temp = weather?.current?.temperature_c;
  const tempLabel = temp == null ? "—" : `${Math.round(temp)}°`;
  const city = weather?.location_label || weather?.location_place || "Joylashuv";
  const regionHero = uzRegionImage(
    weather?.region_id ||
      resolveUzRegion({
        region: weather?.location_region,
        place: weather?.location_place || weather?.location_label,
        lat: coords?.lat ?? weather?.latitude,
        lon: coords?.lon ?? weather?.longitude,
      }),
  );
  const featured = (search.trim() ? searchQ.data : catalogProducts) || [];

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[var(--morph-bg,#FAFAFA)] text-[var(--morph-fg,#111111)]">
      <div
        className={cn(
          "relative z-[1] mx-auto w-full px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-8",
          panel === "hub" ? "max-w-[430px] px-3" : panel === "weather" ? "max-w-lg" : "max-w-lg md:max-w-2xl",
        )}
        style={
          panel === "weather" ? undefined : { paddingTop: "max(0.75rem, env(safe-area-inset-top))" }
        }
      >
        <div
          className={cn(
            "flex items-center",
            (panel === "weather" || panel === "hub") && "hidden",
            panel === "routine"
              ? "grid grid-cols-[44px_1fr_44px]"
              : panel === "hub"
                ? "justify-center lg:justify-between"
                : "justify-between",
          )}
        >
          {panel === "hub" ? (
            <span className="hidden lg:inline-flex">
              <BackLink label={t("common.back")} />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setPanel("hub")}
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 active:scale-95"
              aria-label={t("common.back")}
            >
              <ChevronLeft className="size-5" strokeWidth={2.25} />
            </button>
          )}
          {panel === "routine" ? (
            <div className="min-w-0 text-center">
              <p className="truncate text-[15px] font-extrabold tracking-tight">
                {t("aiStylePage.care.routine.planTitle", {
                  defaultValue: "Morf AI Parvarish Rejasi",
                })}
              </p>
              <p className="truncate text-[11px] text-[#111111]/45">
                {t(`aiStylePage.care.conditions.${plan.condition}`, {
                  defaultValue: plan.condition,
                })}
                {" · "}
                {t(`aiStylePage.care.textures.${plan.texture}`, { defaultValue: plan.texture })}
              </p>
            </div>
          ) : (
            <span className="text-[13px] font-semibold tracking-tight">
              {panel === "weather"
                ? "Ob-havo"
                : panel === "shelf"
                  ? "Javon"
                  : panel === "mine"
                    ? "Mening mahsulotlarim"
                  : panel === "growth"
                    ? "O‘sish · Tez orada"
                    : "Parvarish"}
            </span>
          )}
          {panel === "routine" ? <span /> : null}
        </div>

        {panel === "hub" ? (
          <div className="mx-auto flex w-full max-w-[430px] flex-col">
            <button
              type="button"
              onClick={() => {
                if (needPlus()) return;
                setPanel("weather");
              }}
              className="relative mt-2 h-[168px] w-full overflow-hidden rounded-[28px] text-left text-white"
            >
              {regionHero ? (
                <img src={regionHero} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600" />
              )}
              <span className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/70" />
              <span className="relative flex h-full flex-col justify-between px-4 py-3">
                <span className="flex items-start justify-between gap-3">
                  <span
                    role="presentation"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigateBack(router, "/ai-style");
                    }}
                    className="inline-flex size-10 items-center justify-center rounded-xl bg-white text-[#111111]"
                  >
                    <ChevronLeft className="size-5" strokeWidth={2.25} />
                  </span>
                  <span className="max-w-[11rem] truncate rounded-full bg-black/35 px-3 py-1.5 text-[12px] font-semibold backdrop-blur-sm">
                    {city}
                  </span>
                </span>
                <span className="flex items-end justify-between gap-3 pb-1">
                  <span className="flex items-end gap-3">
                    <span className="text-[52px] leading-none font-bold tracking-tight tabular-nums">
                      {tempLabel}
                    </span>
                    <span className="mb-1">
                      <span className="block text-[15px] font-semibold">{weatherName}</span>
                      <span className="block text-[12px] text-white/80">
                        {weather?.current?.humidity_pct != null
                          ? `Namlik ${Math.round(weather.current.humidity_pct)}%`
                          : "Mahsulotlaringiz uchun maslahatlar"}
                      </span>
                    </span>
                  </span>
                  <span className="mb-1 inline-flex items-center rounded-full bg-white px-3 py-2 text-[12px] font-bold text-[#111111]">
                    Maslahatlarni ko‘rish →
                  </span>
                </span>
              </span>
            </button>

            <div className="mt-3 grid h-[92px] grid-cols-3 gap-2">
              {(
                [
                  { key: "sos" as const, label: "SOS" },
                  { key: "shelf" as const, label: "Javon" },
                  { key: "growth" as const, label: "O‘sish" },
                ]
              ).map((card) => (
                <button
                  key={card.key}
                  type="button"
                  disabled={card.key === "growth"}
                  onClick={() => {
                    if (card.key === "growth") return;
                    if (needPro()) return;
                    if (card.key === "sos") setSosOpen(true);
                    else setPanel("shelf");
                  }}
                  className={cn(
                    "relative h-[92px] overflow-hidden rounded-2xl text-left",
                    card.key === "growth" && "cursor-not-allowed opacity-90",
                  )}
                >
                  <CareQuickArt kind={card.key} />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  {card.key === "growth" ? (
                    <span className="absolute top-1.5 right-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      Tez orada
                    </span>
                  ) : null}
                  <span className="absolute bottom-2 left-2 text-[12px] font-bold text-white">{card.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchOpen(true);
              }}
              className="mt-3 flex h-12 w-full cursor-pointer items-center gap-2 rounded-full bg-white px-4 text-left ring-1 ring-black/10"
            >
              <Search className="size-4 text-[#111111]" />
              <span className="flex-1 text-[14px] text-[#737373]">Mahsulot qidirish...</span>
              <span className="grid size-8 place-items-center rounded-full bg-[#111111] text-white">
                <SlidersHorizontal className="size-3.5" />
              </span>
            </button>

            <div className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {catalogQ.isLoading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="h-[168px] w-[132px] shrink-0 animate-pulse rounded-2xl bg-white" />
                  ))
                : featured.slice(0, 8).map((product) => {
                    const mine = (myQ.data || []).some((row) => row.id === product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          if (needPlus()) return;
                          void navigate({
                            to: "/ai-style/care/products/$productId",
                            params: { productId: String(product.id) },
                          });
                        }}
                        className="relative h-[168px] w-[132px] shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-[#111111] text-left text-white"
                      >
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="absolute inset-0 size-full object-cover" />
                        ) : null}
                        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                        <span
                          role="presentation"
                          onClick={(event) => {
                            event.stopPropagation();
                            void likeProduct(product.id);
                          }}
                          className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white text-[#111111]"
                        >
                          <Heart
                            className={cn("size-4", product.liked_by_me && "fill-red-500 text-red-500")}
                          />
                        </span>
                        {typeof product.match_percent === "number" ? (
                          <span className="absolute top-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#111111]">
                            {product.match_percent}%
                          </span>
                        ) : null}
                        <span
                          role="presentation"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (mine || busyProductId === product.id) return;
                            if (needPlus()) return;
                            void addProduct(product.id);
                          }}
                          className="absolute right-2 bottom-[34%] grid size-8 place-items-center rounded-full bg-white text-[#111111]"
                        >
                          {mine ? (
                            <span className="text-[11px] font-bold">✓</span>
                          ) : (
                            <Plus className="size-4" strokeWidth={2.4} />
                          )}
                        </span>
                        <span className="absolute inset-x-2.5 bottom-2.5">
                          <span className="block truncate text-[10px] font-medium text-white/75">
                            {product.brand || "MORF Care"}
                          </span>
                          <span className="block truncate text-[13px] font-semibold">{product.name}</span>
                        </span>
                      </button>
                    );
                  })}
            </div>

            <div className="mt-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5">
              <button
                type="button"
                onClick={() => setPanel("mine")}
                className="mb-3 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#F4F4F5] px-3 py-2 text-[13px] font-semibold"
              >
                Mening mahsulotlarim
                <ChevronRight className="size-3.5 text-[#737373]" />
              </button>
              <div className="grid h-[148px] grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (needPlus()) return;
                    setPanel("routine");
                  }}
                  className="relative overflow-hidden rounded-2xl text-left"
                >
                  <CareHubCardArt kind="routine" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#111111]">
                    Faol
                  </span>
                  <span className="absolute inset-x-2.5 bottom-2.5 text-white">
                    <span className="block text-[15px] font-bold">Parvarish</span>
                    <span className="block text-[12px]">
                      {t(`aiStylePage.care.conditions.${plan.condition}`, { defaultValue: plan.condition })}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (needPlus()) return;
                    void navigate({ to: "/ai-style/care/ingredient" });
                  }}
                  className="relative overflow-hidden rounded-2xl text-left"
                >
                  <CareHubCardArt kind="scan" />
                  <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-[#171717]">
                    Tahlil qilingan
                  </span>
                  <span className="absolute inset-x-2.5 bottom-2.5 text-[#171717]">
                    <span className="block text-[15px] font-bold">Tarkib</span>
                    <span className="block text-[12px]">Skaner</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        ) : panel === "routine" ? (
          <CareAiRoutine
            quiz={quiz}
            myProducts={myQ.data || []}
            catalog={catalogProducts}
            loadingProducts={myQ.isLoading}
            onOpenCatalog={() => setPanel("hub")}
            onOpenScan={() => navigate({ to: "/ai-style/care/ingredient" })}
            onOpenProduct={(id) =>
              navigate({
                to: "/ai-style/care/products/$productId",
                params: { productId: String(id) },
              })
            }
          />
        ) : panel === "growth" ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-black/10 bg-white/70 px-6 py-12 text-center shadow-sm">
            <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-[#111111]/5">
              <Sparkles className="size-6 text-[#111111]/60" />
            </span>
            <span className="inline-block rounded-full bg-[#111111]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#111111]/70">
              Tez orada
            </span>
            <h3 className="mt-3 text-lg font-bold text-[#111111]">O‘sish tahlili tez orada</h3>
            <p className="mt-1.5 max-w-sm text-sm text-[#111111]/55">
              Soch o‘sish sur‘ati, 3 oylik prognoz va tahlil moduli tez orada ishga tushadi.
            </p>
            <button
              type="button"
              onClick={() => setPanel("hub")}
              className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-[#111111] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#111111]/90"
            >
              Parvarish markaziga qaytish
            </button>
          </div>
        ) : panel === "mine" ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(myQ.data || []).length === 0 ? (
              <p className="col-span-2 rounded-2xl bg-white px-4 py-6 text-sm text-[#111111]/50">
                Hali mahsulot qo‘shilmagan. Qidiruvdan qo‘shing.
              </p>
            ) : (
              (myQ.data || []).map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/ai-style/care/products/$productId",
                      params: { productId: String(row.id) },
                    })
                  }
                  className="overflow-hidden rounded-2xl bg-white text-left ring-1 ring-black/5"
                >
                  {row.image_url ? (
                    <img src={row.image_url} alt="" className="aspect-square w-full object-contain p-3" />
                  ) : (
                    <span className="block aspect-square bg-[#F4F4F5]" />
                  )}
                  <span className="block px-3 pb-3 text-[13px] font-semibold">{row.name}</span>
                </button>
              ))
            )}
          </div>
        ) : panel === "shelf" ? (
          <div className="mt-4">
            <CareShelfTracker />
          </div>
        ) : (
          <CareWeatherPanel
            weather={weather}
            loading={weatherQ.isLoading}
            error={weatherQ.error instanceof Error ? weatherQ.error.message : null}
            onRetry={() => void weatherQ.refetch()}
            regionId={regionId}
            onRegion={(id) => {
              setRegionId(id);
              try {
                if (id) localStorage.setItem("care-weather-region", id);
                else localStorage.removeItem("care-weather-region");
              } catch {
                /* ignore */
              }
            }}
            onBack={() => setPanel("hub")}
            hairCondition={hairQ.data?.condition || quiz.condition}
            myProducts={myQ.data || []}
          />
        )}
      </div>

      {searchOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label={t("common.close")}
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setSearchOpen(false);
              setSearch("");
            }}
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[86dvh] w-full max-w-[430px] flex-col rounded-t-3xl bg-[#FAFAFA] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
            <div className="flex items-center gap-2">
              <label className="flex h-11 flex-1 items-center gap-2 rounded-full bg-white px-3 ring-1 ring-black/10">
                <Search className="size-4" />
                <input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Mahsulot qidirish"
                  className="h-full w-full bg-transparent text-sm outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  setSearch("");
                }}
                className="grid size-10 cursor-pointer place-items-center rounded-full bg-white ring-1 ring-black/10"
                aria-label={t("common.close")}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pb-2">
              {(search.trim() ? searchQ.data || [] : catalogProducts).map((item) => {
                const added = (myQ.data || []).some((row) => row.id === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (needPlus()) return;
                      setSearchOpen(false);
                      void navigate({
                        to: "/ai-style/care/products/$productId",
                        params: { productId: String(item.id) },
                      });
                    }}
                    className="overflow-hidden rounded-2xl bg-white text-left ring-1 ring-black/5"
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className="aspect-square w-full object-contain p-2" />
                    ) : (
                      <span className="block aspect-square bg-[#F4F4F5]" />
                    )}
                    <span className="block px-2.5 pt-1 text-[13px] font-semibold leading-snug">{item.name}</span>
                    {typeof item.match_percent === "number" ? (
                      <span className="block px-2.5 text-[12px] font-bold text-[#111111]/70">
                        {item.match_percent}% mos
                      </span>
                    ) : null}
                    <span
                      role="presentation"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (added) return;
                        if (needPlus()) return;
                        void addProduct(item.id);
                      }}
                      className="mx-2.5 mt-2 mb-2.5 inline-flex h-8 items-center rounded-full bg-[#111111] px-3 text-[12px] font-semibold text-white"
                    >
                      {added ? "Qo‘shilgan" : "Qo‘shish"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      <BadHairDaySosSheet open={sosOpen} onClose={() => setSosOpen(false)} />
      <MorphLimitUpsell
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        kind="care"
        me={meQ.data ?? null}
        preferPlan={paywallPrefer}
      />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => navigateBack(router, "/ai-style")}
      className="inline-flex size-11 items-center justify-center rounded-full bg-[#F0F0F0] touch-manipulation cursor-pointer active:scale-95 transition-transform"
      aria-label={label}
    >
      <ChevronLeft className="size-5" strokeWidth={2.25} />
    </button>
  );
}
