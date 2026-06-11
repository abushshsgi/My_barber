import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Stepper } from "@/components/Stepper";
import { useRegions } from "@/hooks/use-regions";
import { useUpdateMe } from "@/hooks/use-me";
import { roundCoord } from "@/lib/api/list-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Profil sozlash — mysaloon.uz" }] }),
  component: OnboardingFlow,
});

const STEPS = ["Ism", "Yosh", "Joylashuv"];

function OnboardingFlow() {
  const navigate = useNavigate();
  const updateMe = useUpdateMe();
  const { data: regions = [], isLoading: regionsLoading } = useRegions();

  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [region, setRegion] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);

  const canNext =
    (step === 1 && firstName.trim().length >= 2 && lastName.trim().length >= 2) ||
    (step === 2 && parseInt(age, 10) >= 10 && parseInt(age, 10) <= 100) ||
    (step === 3 && region.length > 0);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Brauzeringiz joylashuvni qo'llab-quvvatlamaydi");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
        toast.success("Joylashuv aniqlandi — yaqin salonlar ko'rsatiladi");
      },
      () => {
        setLocating(false);
        toast.error("Joylashuvga ruxsat bering yoki viloyatni tanlang");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const finish = async () => {
    const ageNum = parseInt(age, 10);
    const birthYear = new Date().getFullYear() - ageNum;
    try {
      await updateMe.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_year: birthYear,
        region,
        ...(lat != null && lng != null
          ? { latitude: roundCoord(lat), longitude: roundCoord(lng) }
          : {}),
        onboarding_completed: true,
      });
      toast.success("Profil tayyor!");
      void navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Saqlashda xatolik");
    }
  };

  const onPrimary = () => {
    if (step < 3) {
      if (canNext) setStep((s) => s + 1);
      return;
    }
    if (canNext) void finish();
  };

  const busy = updateMe.isPending || locating;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-6 py-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Yangi profil
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">Sizni tanishib olaylik</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bir necha qadam — keyin sizga yaqin salon va ustalarni tavsiya qilamiz.
      </p>

      <div className="mt-6">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="flex flex-1 flex-col justify-center py-8">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <User className="h-4 w-4" />
              Ism va familiya
            </div>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ism"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Familiya"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Calendar className="h-4 w-4" />
              Yoshingiz
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={100}
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="Masalan: 25"
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            />
            <p className="text-xs text-muted-foreground">
              Xizmatlar va tavsiyalar yoshga mos tanlanadi.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="h-4 w-4" />
              Joylashuv
            </div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Viloyat
            </label>
            <select
              value={region}
              disabled={regionsLoading}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-sm font-bold focus:border-foreground focus:outline-none"
            >
              <option value="">Tanlang…</option>
              {regions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={detectLocation}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/40 py-3.5 text-sm font-bold"
            >
              <MapPin className="h-4 w-4" />
              {lat != null ? "Joylashuv aniqlandi ✓" : "GPS orqali aniqlash"}
            </button>
            {lat != null && lng != null ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Aniq joylashuv saqlandi — eng yaqin salonlar birinchi ko‘rsatiladi.
              </p>
            ) : (
              <p className="text-center text-[11px] text-muted-foreground">
                GPS bo‘lmasa ham viloyat bo‘yicha tavsiya ishlaydi.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {step > 1 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 rounded-2xl border-2 border-foreground py-4 text-sm font-bold"
          >
            Orqaga
          </button>
        ) : null}
        <button
          type="button"
          disabled={!canNext || busy}
          onClick={onPrimary}
          className={cn(
            "rounded-2xl bg-foreground py-4 text-sm font-bold text-background disabled:opacity-50",
            step > 1 ? "flex-[2]" : "w-full",
          )}
        >
          {busy ? "Kutilmoqda…" : step === 3 ? "Boshlash" : "Keyingi"}
        </button>
      </div>
    </div>
  );
}
