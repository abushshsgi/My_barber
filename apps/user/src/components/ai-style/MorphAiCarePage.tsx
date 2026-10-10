import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, CloudSun, Loader2, Lock, Search, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { navigateBack } from "@/lib/mobile-back";
import { CareAiRoutine } from "@/components/ai-style/CareAiRoutine";
import { CareWeatherPanel } from "@/components/ai-style/CareWeatherPanel";
import {
  buildCarePlan,
  careOptionImage,
  isCareQuizComplete,
  loadCareQuiz,
  saveCareQuiz,
  type CareQuizAnswers,
  type ColorStatus,
  type HairCondition,
  type HairTexture,
} from "@/lib/morf-ai-care";
import { loadFaceProfile } from "@/lib/face-profile";
import { fetchCareAccess } from "@/lib/api/subscriptions";
import { cn } from "@/lib/utils";
import { useHairCareProfile, useUpdateHairCareProfile } from "@/hooks/use-hair-care-profile";
import { useCareProducts } from "@/hooks/use-care-products";
import { BadHairDaySosSheet } from "@/components/ai-style/BadHairDaySosSheet";
import { CareShelfTracker } from "@/components/ai-style/CareShelfTracker";
import {
  fetchMyCareProducts,
  fetchWeatherCare,
  generateHairGrowthForecast,
  type CareProduct,
  type HairGrowthForecast,
} from "@/lib/api/care-products";
import { getFastPosition } from "@/lib/native-geolocation";
import { resolveUzRegion, uzRegionImage, type UzRegionId } from "@/lib/uz-care-regions";

const CONDITION_OPTS: HairCondition[] = ["oily", "dry", "normal", "damaged"];
const TEXTURE_OPTS: HairTexture[] = ["straight", "wavy", "curly"];
const COLOR_OPTS: ColorStatus[] = ["natural", "colored", "bleached"];

type QuizStep = 0 | 1 | 2;

const ease = [0.22, 1, 0.36, 1] as const;

export function MorphAiCarePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const accessQ = useQuery({
    queryKey: ["subscriptions", "care-access"],
    queryFn: fetchCareAccess,
    staleTime: 30_000,
  });
  const hairQ = useHairCareProfile();
  const updateHair = useUpdateHairCareProfile();
  const catalogQ = useCareProducts({ recommended: true });
  const profile = useMemo(() => loadFaceProfile(), []);
  const savedQuiz = useMemo(() => loadCareQuiz(), []);
  const [quiz, setQuiz] = useState<CareQuizAnswers>(
    () => (savedQuiz && isCareQuizComplete(savedQuiz) ? savedQuiz : { condition: "", texture: "", colorStatus: "" }),
  );
  const [step, setStep] = useState<QuizStep | "plan">(
    savedQuiz && isCareQuizComplete(savedQuiz) ? "plan" : 0,
  );
  const [panel, setPanel] = useState<"hub" | "routine" | "shelf" | "weather" | "growth">("routine");
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [regionId, setRegionId] = useState<UzRegionId | null>(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [growthCm, setGrowthCm] = useState("8");
  const [growthBusy, setGrowthBusy] = useState(false);
  const [growth, setGrowth] = useState<HairGrowthForecast | null>(null);
  const [growthError, setGrowthError] = useState("");
  const searchQ = useCareProducts({ q: search.trim() || undefined, enabled: search.trim().length > 0 });
  const weatherQ = useQuery({
    queryKey: ["ai", "care", "weather", quiz.condition, quiz.texture, coords?.lat ?? null, coords?.lon ?? null, regionId],
    queryFn: () =>
      fetchWeatherCare({
        condition: quiz.condition,
        texture: quiz.texture,
        lat: regionId ? undefined : coords?.lat,
        lon: regionId ? undefined : coords?.lon,
        region_id: regionId || undefined,
      }),
    enabled: step === "plan",
    staleTime: 10 * 60_000,
  });
  const myQ = useQuery({
    queryKey: ["ai", "care", "my-products"],
    queryFn: fetchMyCareProducts,
    enabled: step === "plan",
    staleTime: 20_000,
  });
  const plan = useMemo(() => buildCarePlan(profile, quiz), [profile, quiz]);
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
    if (hydratedHair.current || !hairQ.data?.complete) return;
    hydratedHair.current = true;
    const next: CareQuizAnswers = {
      condition: hairQ.data.condition as HairCondition,
      texture: hairQ.data.texture as HairTexture,
      colorStatus: hairQ.data.color_status as ColorStatus,
    };
    setQuiz(next);
    saveCareQuiz(next);
    setStep("plan");
  }, [hairQ.data]);

  if (accessQ.isLoading || hairQ.isLoading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#FAFAFA] text-[#111111]">
        <Loader2 className="size-6 animate-spin text-[#111111]/40" />
      </div>
    );
  }

  if (accessQ.data && !accessQ.data.allowed) {
    return (
      <div
        className="min-h-[100dvh] bg-[#FAFAFA] px-5 text-[#111111]"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <BackLink label={t("common.back")} />
        <div className="mx-auto mt-24 max-w-xs text-center">
          <Lock className="mx-auto size-6 text-[#111111]/50" />
          <h1 className="mt-4 text-lg font-semibold tracking-tight">
            {t("aiStylePage.care.badge", { defaultValue: "Parvarish" })}
          </h1>
          <p className="mt-2 text-sm text-[#111111]/50">
            {accessQ.data.detail ||
              t("aiStylePage.care.proOnly", { defaultValue: "Pro obunasida." })}
          </p>
          <Link
            to="/wallet"
            search={{ section: "subscriptions" }}
            className="mt-8 inline-flex h-12 items-center rounded-full bg-[#111111] px-6 text-sm font-semibold text-white"
          >
            {t("aiStylePage.care.seePlans", { defaultValue: "Obunalar" })}
          </Link>
        </div>
      </div>
    );
  }

  const finishQuiz = () => {
    if (!isCareQuizComplete(quiz)) return;
    saveCareQuiz(quiz);
    void updateHair
      .mutateAsync({
        condition: quiz.condition,
        texture: quiz.texture,
        color_status: quiz.colorStatus,
        scalp:
          quiz.condition === "oily"
            ? "oily"
            : quiz.condition === "dry" || quiz.condition === "damaged"
              ? "dry"
              : "normal",
      })
      .catch(() => undefined);
    setStep("plan");
  };

  if (step !== "plan") {
    const questions = [
      {
        title: t("aiStylePage.care.quiz.conditionQ", { defaultValue: "Soch holati?" }),
        options: CONDITION_OPTS,
        value: quiz.condition,
        onPick: (v: string) => setQuiz((q) => ({ ...q, condition: v as HairCondition })),
        labelKey: "aiStylePage.care.conditions",
      },
      {
        title: t("aiStylePage.care.quiz.textureQ", { defaultValue: "Tekstura?" }),
        options: TEXTURE_OPTS,
        value: quiz.texture,
        onPick: (v: string) => setQuiz((q) => ({ ...q, texture: v as HairTexture })),
        labelKey: "aiStylePage.care.textures",
      },
      {
        title: t("aiStylePage.care.quiz.colorQ", { defaultValue: "Rang?" }),
        options: COLOR_OPTS,
        value: quiz.colorStatus,
        onPick: (v: string) => setQuiz((q) => ({ ...q, colorStatus: v as ColorStatus })),
        labelKey: "aiStylePage.care.colors",
      },
    ] as const;
    const current = questions[step];
    const progress = ((step + 1) / questions.length) * 100;

    return (
      <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#FAFAFA] text-[#111111]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.07),transparent_65%)]" />
        <div
          className="relative z-[1] flex min-h-[100dvh] flex-col px-5 pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between">
            <BackLink label={t("common.back")} />
            <span className="text-[12px] tabular-nums text-[#111111]/35">{step + 1}/3</span>
          </div>

          <div className="mt-6 h-[2px] overflow-hidden rounded-full bg-white">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: reduce ? 0 : 0.4, ease }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.32, ease }}
              className="mt-10 flex-1"
            >
              <h1 className="max-w-[16rem] text-[1.7rem] font-semibold leading-[1.15] tracking-tight">
                {current.title}
              </h1>

              <div
                className={cn(
                  "mt-7 grid gap-2.5",
                  current.options.length === 3 ? "grid-cols-3" : "grid-cols-2",
                )}
              >
                {current.options.map((opt, i) => {
                  const selected = current.value === opt;
                  return (
                    <motion.button
                      key={opt}
                      type="button"
                      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * i, duration: 0.3, ease }}
                      onClick={() => current.onPick(opt)}
                      className={cn(
                        "relative cursor-pointer overflow-hidden rounded-[20px] border text-left touch-manipulation",
                        selected ? "border-white" : "border-black/10",
                      )}
                    >
                      <div className="relative aspect-[3/4]">
                        <img
                          src={careOptionImage(opt)}
                          alt=""
                          className="h-full w-full object-cover object-top"
                          draggable={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <p className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 text-[12px] font-semibold leading-tight">
                          {t(`${current.labelKey}.${opt}`, { defaultValue: opt })}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as QuizStep)}
                className="h-12 flex-1 cursor-pointer rounded-full border border-black/10 text-sm font-semibold"
              >
                {t("common.back")}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!current.value}
              onClick={() => {
                if (step === 2) finishQuiz();
                else setStep((step + 1) as QuizStep);
              }}
              className="h-12 flex-[1.6] cursor-pointer rounded-full bg-[#111111] text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-40"
            >
              {step === 2
                ? t("aiStylePage.care.quiz.seePlan", { defaultValue: "Davom etish" })
                : t("common.next")}
            </button>
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
    <div className="relative min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#F3F3F4] text-[#111111]">
      <div
        className={cn(
          "relative z-[1] mx-auto w-full px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-8",
          panel === "hub"
            ? "max-w-lg sm:max-w-xl md:max-w-4xl lg:max-w-[1100px] xl:max-w-[1200px]"
            : "max-w-lg md:max-w-2xl",
        )}
        style={panel === "weather" ? undefined : { paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div
          className={cn(
            "flex items-center",
            panel === "weather" && "hidden",
            panel === "routine" ? "grid grid-cols-[44px_1fr_44px]" : "justify-between",
          )}
        >
          {panel === "hub" ? (
            <BackLink label={t("common.back")} />
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
                {t("aiStylePage.care.routine.planTitle", { defaultValue: "Morf AI Parvarish Rejasi" })}
              </p>
              <p className="truncate text-[11px] text-[#111111]/45">
                {t(`aiStylePage.care.conditions.${quiz.condition}`, { defaultValue: quiz.condition })}
                {" · "}
                {t(`aiStylePage.care.textures.${quiz.texture}`, { defaultValue: quiz.texture })}
              </p>
            </div>
          ) : (
            <span className="text-[13px] font-semibold tracking-tight">
              {panel === "weather"
                ? "Ob-havo"
                : panel === "shelf"
                  ? "Mening mahsulotlarim"
                  : panel === "growth"
                    ? "O‘sish"
                    : "Parvarish"}
            </span>
          )}
          {panel === "routine" ? <span /> : null}
        </div>

        {panel === "hub" ? (
          <>
            <div className="mt-4 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.85fr)] lg:items-stretch lg:gap-5">
              <button
                type="button"
                onClick={() => setPanel("weather")}
                className="relative h-48 w-full overflow-hidden rounded-3xl text-left text-white shadow-[0_16px_40px_-18px_rgba(0,0,0,0.45)] lg:h-auto lg:min-h-[280px]"
              >
                {regionHero ? (
                  <img src={regionHero} alt="" className="absolute inset-0 size-full object-cover object-right" />
                ) : (
                  <span className="absolute inset-0 bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-600" />
                )}
                <span className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/15" />
                <span className="relative flex h-full flex-col justify-between p-4 lg:p-6">
                  <span className="flex items-start justify-between gap-3">
                    <CloudSun className="size-6 text-white/90" />
                    <span className="max-w-[12rem] truncate rounded-full bg-black/35 px-3 py-1 text-[12px] font-semibold backdrop-blur-sm lg:max-w-[16rem] lg:text-sm">
                      {city}
                    </span>
                  </span>
                  <span className="flex items-end justify-between gap-3">
                    <span>
                      <span className="block text-5xl font-bold tracking-tight tabular-nums lg:text-6xl">{tempLabel}</span>
                      <span className="mt-1 block text-sm font-medium text-white/90">{weatherName}</span>
                      {weather?.current?.humidity_pct != null ? (
                        <span className="mt-0.5 block text-xs text-white/75">
                          Namlik {Math.round(weather.current.humidity_pct)}%
                        </span>
                      ) : null}
                    </span>
                    <span className="rounded-full bg-white px-3 py-2 text-[12px] font-bold text-[#111111] lg:px-4 lg:py-2.5 lg:text-sm">
                      Tavsiyalar →
                    </span>
                  </span>
                </span>
              </button>

              <div className="mt-4 grid grid-cols-3 gap-2 lg:mt-0 lg:grid-cols-1 lg:grid-rows-3 lg:gap-3">
                <button
                  type="button"
                  onClick={() => setSosOpen(true)}
                  className="relative h-28 cursor-pointer overflow-hidden rounded-2xl text-left text-white lg:h-full lg:min-h-[5.5rem] lg:rounded-3xl"
                >
                  <img src="/care/care-card-sos.jpg" alt="" className="absolute inset-0 size-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[12px] font-bold leading-tight lg:bottom-3.5 lg:left-3.5 lg:text-sm">
                    SOS
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPanel("shelf")}
                  className="relative h-28 cursor-pointer overflow-hidden rounded-2xl text-left text-white lg:h-full lg:min-h-[5.5rem] lg:rounded-3xl"
                >
                  <img src="/care/care-card-shelf.jpg" alt="" className="absolute inset-0 size-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[12px] font-bold leading-tight lg:bottom-3.5 lg:left-3.5 lg:text-sm">
                    Javon
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPanel("growth")}
                  className="relative h-28 cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFF3E8] to-[#E7B48A] text-left text-white lg:h-full lg:min-h-[5.5rem] lg:rounded-3xl"
                >
                  <span className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  <span className="absolute bottom-2.5 left-2.5 text-[12px] font-bold leading-tight lg:bottom-3.5 lg:left-3.5 lg:text-sm">
                    O‘sish
                  </span>
                </button>
              </div>
            </div>

            <label className="mt-4 flex h-12 items-center gap-2 rounded-full bg-white px-4 ring-1 ring-black/10 lg:mt-6 lg:h-14 lg:px-5">
              <Search className="size-4 text-[#111111]/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tavsiya va mahsulot qidirish"
                className="h-full w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#111111]/35 lg:text-[15px]"
              />
            </label>

            <div className="mt-5 lg:mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[13px] font-bold lg:text-base">Tavsiyalar</h2>
                <Link to="/ai-style/care/products" className="text-[12px] font-semibold text-[#111111]/45 lg:text-sm">
                  Hammasi
                </Link>
              </div>
              {search.trim() && searchQ.isLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse rounded-3xl bg-white" />
                  ))}
                </div>
              ) : search.trim() && featured.length === 0 ? (
                <p className="rounded-2xl bg-white px-4 py-3 text-sm text-[#111111]/45">Topilmadi</p>
              ) : (
                <div
                  className={cn(
                    search.trim()
                      ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                      : "-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4 xl:grid-cols-5 [&::-webkit-scrollbar]:hidden [&>a]:w-[9.5rem] [&>a]:shrink-0 md:[&>a]:w-auto",
                  )}
                >
                  {(catalogQ.isLoading ? [] : featured).slice(0, search.trim() ? 12 : 8).map((p) => (
                    <CareCatalogCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-stretch lg:gap-5">
              <button
                type="button"
                onClick={() => setPanel("shelf")}
                className="flex w-full cursor-pointer items-center gap-2 rounded-3xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-black/5 lg:px-5"
              >
                <ShoppingBag className="size-4" />
                <span className="flex-1 text-sm font-bold lg:text-base">Mening mahsulotlarim</span>
                <ChevronRight className="size-4 text-[#111111]/35" />
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-0 lg:gap-4">
                <button
                  type="button"
                  onClick={() => setPanel("routine")}
                  className="relative h-40 overflow-hidden rounded-2xl text-left text-white lg:h-52 lg:rounded-3xl"
                >
                  <img src="/care/care-card-routine.jpg" alt="" className="absolute inset-0 size-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 text-sm font-bold lg:text-base">Parvarish</span>
                </button>
                <Link
                  to="/ai-style/care/ingredient"
                  className="relative h-40 overflow-hidden rounded-2xl text-left text-white lg:h-52 lg:rounded-3xl"
                >
                  <img src="/care/care-card-scan.jpg" alt="" className="absolute inset-0 size-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 text-sm font-bold lg:text-base">Tarkib</span>
                </Link>
              </div>
            </div>
          </>
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
          <div className="mt-6 space-y-3">
            <h1 className="text-[1.6rem] font-extrabold tracking-tight">O‘sish</h1>
            <p className="text-sm text-[#111111]/55">
              Hozirgi uzunlik bo‘yicha 3 oylik prognoz.
            </p>
            <label className="block rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
              <span className="text-[11px] font-semibold text-[#111111]/45">Uzunlik, sm</span>
              <input
                value={growthCm}
                onChange={(e) => setGrowthCm(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="mt-1 w-full bg-transparent text-2xl font-bold outline-none"
              />
            </label>
            <button
              type="button"
              disabled={growthBusy}
              onClick={() => {
                const cm = Number(growthCm);
                if (!Number.isFinite(cm) || cm <= 0) return;
                setGrowthBusy(true);
                setGrowthError("");
                void generateHairGrowthForecast({
                  current_length_cm: cm,
                  check_ins_count: 1,
                  products_used: (myQ.data || []).map((p) => p.name),
                })
                  .then(setGrowth)
                  .catch((e: unknown) =>
                    setGrowthError(e instanceof Error ? e.message : "Prognoz yaratilmadi."),
                  )
                  .finally(() => setGrowthBusy(false));
              }}
              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[#111111] text-sm font-semibold text-white disabled:opacity-50"
            >
              {growthBusy ? "Hisoblanmoqda…" : "Prognoz"}
            </button>
            {growthError ? <p className="text-sm text-red-600">{growthError}</p> : null}
            {growth ? (
              <div className="rounded-2xl bg-white px-4 py-4 ring-1 ring-black/5">
                <p className="text-3xl font-extrabold tabular-nums">
                  {growth.projected_length_3_months} sm
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#111111]/40">
                  3 oy · {growth.growth_rate_status}
                </p>
                <p className="mt-3 text-sm leading-relaxed">{growth.ai_commentary}</p>
                {growth.recommended_action ? (
                  <p className="mt-2 text-sm text-[#111111]/60">{growth.recommended_action}</p>
                ) : null}
              </div>
            ) : null}
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
            hairCondition={quiz.condition}
            myProducts={myQ.data || []}
          />
        )}
      </div>

      <BadHairDaySosSheet open={sosOpen} onClose={() => setSosOpen(false)} />
    </div>
  );
}

function CareCatalogCard({ product }: { product: CareProduct }) {
  return (
    <Link
      to="/ai-style/care/products/$productId"
      params={{ productId: String(product.id) }}
      className="flex w-full min-w-0 flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/[0.06]"
    >
      <span className="grid aspect-[4/5] place-items-center bg-[#F7F7F8]">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="size-full object-contain p-3" />
        ) : null}
      </span>
      <span className="line-clamp-2 px-3 py-3 text-[13px] font-semibold leading-snug text-[#111111] lg:text-sm">
        {product.name}
      </span>
    </Link>
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

