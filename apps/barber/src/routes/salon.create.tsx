import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, CheckCircle2, Clock3, Loader2, Plus, Scissors, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { extractApiError, parseJsonSafe } from "@/lib/auth-ui";
import { readSignupDraft } from "@/lib/signup-draft";

type ServiceDraft = {
  id: string;
  name: string;
  price: string;
  duration: string;
};

type DayDraft = {
  weekday: number;
  label: string;
  enabled: boolean;
  open: string;
  close: string;
};

const DAY_ROWS: Array<{ weekday: number; label: string }> = [
  { weekday: 0, label: "Dushanba" },
  { weekday: 1, label: "Seshanba" },
  { weekday: 2, label: "Chorshanba" },
  { weekday: 3, label: "Payshanba" },
  { weekday: 4, label: "Juma" },
  { weekday: 5, label: "Shanba" },
  { weekday: 6, label: "Yakshanba" },
];

const LANG_OPTIONS = ["uz", "ru", "en"];

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export const Route = createFileRoute("/salon/create")({
  component: SalonCreatePage,
});

function SalonCreatePage() {
  const navigate = useNavigate();
  const draft = readSignupDraft();
  const preset = Route.useSearch() as { preset?: string };
  const defaultSalonName =
    preset?.preset === "mybarber" && draft?.full_name
      ? `MyBarber · ${draft.full_name}`
      : "";

  const [step, setStep] = useState(0);
  const [name, setName] = useState(defaultSalonName);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState(draft?.phone || "");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(draft?.latitude || "");
  const [longitude, setLongitude] = useState(draft?.longitude || "");
  const [languages, setLanguages] = useState<string[]>(["uz"]);
  const [services, setServices] = useState<ServiceDraft[]>([
    { id: makeId(), name: "", price: "", duration: "" },
  ]);
  const [hours, setHours] = useState<DayDraft[]>(
    DAY_ROWS.map((d, index) => ({
      weekday: d.weekday,
      label: d.label,
      enabled: index < 6,
      open: "09:00",
      close: "20:00",
    })),
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepValid = useMemo(() => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    const infoOk =
      name.trim().length >= 2 &&
      address.trim().length >= 4 &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;
    const serviceOk =
      services.length > 0 &&
      services.every(
        (s) =>
          s.name.trim().length > 1 &&
          Number.isFinite(Number(s.price)) &&
          Number(s.price) > 0 &&
          Number.isFinite(Number(s.duration)) &&
          Number(s.duration) > 0,
      );
    const hoursOk = hours.some((d) => d.enabled) && languages.length > 0;
    return [infoOk, serviceOk, hoursOk];
  }, [address, hours, languages.length, latitude, longitude, name, services]);

  const canGoNext = stepValid[step];

  function updateService(id: string, patch: Partial<ServiceDraft>) {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function addService() {
    setServices((prev) => [...prev, { id: makeId(), name: "", price: "", duration: "" }]);
  }

  function removeService(id: string) {
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  }

  function updateDay(weekday: number, patch: Partial<DayDraft>) {
    setHours((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((v) => v !== lang) : [...prev, lang],
    );
  }

  async function submitSalon() {
    if (!stepValid.every(Boolean) || loading) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        phone: phone.trim(),
        address: address.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        languages,
        closed_weekdays: hours.filter((d) => !d.enabled).map((d) => d.weekday),
        hours: hours
          .filter((d) => d.enabled)
          .map((d) => ({ weekday: d.weekday, open_time: d.open, close_time: d.close })),
        services: services.map((s) => ({
          name: s.name.trim(),
          price: Number(s.price),
          duration_minutes: Number(s.duration),
        })),
      };

      const res = await apiFetch("/api/v1/salons/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await parseJsonSafe(res);
      if (!res.ok) {
        setError(extractApiError(body, "Salon yaratishda xatolik yuz berdi."));
        return;
      }

      setSuccess(true);
      window.setTimeout(() => {
        void navigate({ to: "/barber" });
      }, 900);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Salon yaratish
              </p>
              <h1 className="text-2xl font-semibold">Salon Create Wizard</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                `salon-creator-suite` dizaynidan moslashtirilgan, backend bilan ulangan forma.
              </p>
            </div>
            <div className="text-sm font-medium">
              {step + 1} / 3
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { title: "Salon", icon: Building2 },
              { title: "Xizmatlar", icon: Scissors },
              { title: "Jadval", icon: Clock3 },
            ].map((item, index) => {
              const done = stepValid[index];
              const active = step === index;
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    if (index <= step) setStep(index);
                  }}
                  className={`rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-foreground bg-background"
                      : done
                        ? "border-border bg-muted/40"
                        : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4" />
                    {item.title}
                    {done && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Salon ma'lumotlari</CardTitle>
              <CardDescription>Nomi, manzili va geolokatsiya</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salon-name">Salon nomi</Label>
                  <Input
                    id="salon-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Prime Fade Studio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salon-phone">Telefon (ixtiyoriy)</Label>
                  <Input
                    id="salon-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salon-address">Manzil</Label>
                <Input
                  id="salon-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ko'cha, uy, mo'ljal"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salon-lat">Latitude</Label>
                  <Input
                    id="salon-lat"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="41.311081"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salon-lng">Longitude</Label>
                  <Input
                    id="salon-lng"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="69.240562"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salon-description">Qisqacha tavsif</Label>
                <Textarea
                  id="salon-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Salon haqida qisqacha ma'lumot"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Xizmatlar</CardTitle>
              <CardDescription>Kamida 1 ta xizmat kiriting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {services.map((service, index) => (
                <div key={service.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Xizmat #{index + 1}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={services.length === 1}
                      onClick={() => removeService(service.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      O'chirish
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input
                      value={service.name}
                      onChange={(e) => updateService(service.id, { name: e.target.value })}
                      placeholder="Nomi"
                    />
                    <Input
                      value={service.price}
                      onChange={(e) =>
                        updateService(service.id, { price: e.target.value.replace(/[^\d.]/g, "") })
                      }
                      placeholder="Narxi"
                    />
                    <Input
                      value={service.duration}
                      onChange={(e) =>
                        updateService(service.id, { duration: e.target.value.replace(/\D/g, "") })
                      }
                      placeholder="Davomiyligi (min)"
                    />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addService}>
                <Plus className="mr-2 h-4 w-4" />
                Xizmat qo'shish
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Ish jadvali va tillar</CardTitle>
              <CardDescription>Qaysi kunlar va qaysi tillarda ishlaysiz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tillar</Label>
                <div className="flex flex-wrap gap-2">
                  {LANG_OPTIONS.map((lang) => {
                    const active = languages.includes(lang);
                    return (
                      <Button
                        key={lang}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang.toUpperCase()}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Haftalik jadval</Label>
                <div className="space-y-2">
                  {hours.map((day) => (
                    <div
                      key={day.weekday}
                      className="grid items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-[160px_110px_1fr_1fr]"
                    >
                      <div className="font-medium">{day.label}</div>
                      <Button
                        type="button"
                        size="sm"
                        variant={day.enabled ? "default" : "outline"}
                        onClick={() => updateDay(day.weekday, { enabled: !day.enabled })}
                      >
                        {day.enabled ? "Ochiq" : "Yopiq"}
                      </Button>
                      <Input
                        type="time"
                        value={day.open}
                        disabled={!day.enabled}
                        onChange={(e) => updateDay(day.weekday, { open: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={day.close}
                        disabled={!day.enabled}
                        onChange={(e) => updateDay(day.weekday, { close: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">
            Salon muvaffaqiyatli yaratildi. Barber panelga yo'naltirilmoqda...
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || loading}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Orqaga
          </Button>
          {step < 2 ? (
            <Button
              type="button"
              disabled={!canGoNext || loading}
              onClick={() => setStep((s) => Math.min(2, s + 1))}
            >
              Keyingi
            </Button>
          ) : (
            <Button type="button" disabled={!stepValid.every(Boolean) || loading} onClick={submitSalon}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Salon yaratish"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

