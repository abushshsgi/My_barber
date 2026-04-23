"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  Scissors,
  Clock,
  Globe2,
  ImageIcon,
  Plus,
  Trash2,
  Check,
  Loader2,
  UploadCloud,
  X,
  ArrowLeft,
  ArrowRight,
  Copy,
  Sun,
  Moon,
  Coffee,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch, formatApiError } from "@/lib/api";

type Service = {
  id: string;
  name: string;
  price: string;
  duration: string;
};

type DaySchedule = {
  day: string;
  open: boolean;
  from: string;
  to: string;
};

type CreateSalonPageProps = {
  preset?: string;
  initialSalonName?: string;
  lockSalonName?: boolean;
  initialAddress?: string;
  initialLat?: string;
  initialLng?: string;
  initialPhone?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const LANGUAGES = [
  { code: "uz", label: "Uzbek" },
  { code: "ru", label: "Russian" },
  { code: "en", label: "English" },
  { code: "tr", label: "Turkish" },
  { code: "ar", label: "Arabic" },
] as const;

const STEPS = ["Profile", "Location", "Services", "Schedule", "Extras", "Media"] as const;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function filePreviewUrl(file: File | null): string | null {
  if (!file) return null;
  return URL.createObjectURL(file);
}

export function CreateSalonPage(props: CreateSalonPageProps) {
  const router = useRouter();

  const [name, setName] = useState(props.initialSalonName || "");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState(props.initialPhone || "");
  const [address, setAddress] = useState(props.initialAddress || "");
  const [lat, setLat] = useState(props.initialLat || "");
  const [lng, setLng] = useState(props.initialLng || "");

  const [services, setServices] = useState<Service[]>([
    { id: uid(), name: "", price: "", duration: "" },
  ]);

  const [schedule, setSchedule] = useState<DaySchedule[]>(
    WEEKDAYS.map((d, i) => ({
      day: d,
      open: i < 6,
      from: "09:00",
      to: "20:00",
    })),
  );

  const [languages, setLanguages] = useState<string[]>(["en"]);
  const [closedDays, setClosedDays] = useState<string[]>(["Sun"]);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [coverDrag, setCoverDrag] = useState(false);
  const [galleryDrag, setGalleryDrag] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const coverPreview = useMemo(() => filePreviewUrl(coverFile), [coverFile]);
  const galleryPreviews = useMemo(() => galleryFiles.map((f) => URL.createObjectURL(f)), [galleryFiles]);

  const isValid = useMemo(() => {
    return (
      name.trim().length > 1 &&
      phone.trim().length > 4 &&
      address.trim().length > 2 &&
      services.every((s) => s.name && s.price && s.duration)
    );
  }, [name, phone, address, services]);

  const stepValid = useMemo(() => {
    return [
      Boolean(name.trim() && phone.trim() && address.trim()),
      Boolean(lat && lng),
      services.every((s) => s.name && s.price && s.duration),
      schedule.some((d) => d.open),
      languages.length > 0,
      Boolean(coverFile || galleryFiles.length > 0),
    ];
  }, [name, phone, address, lat, lng, services, schedule, languages, coverFile, galleryFiles]);

  const completedSteps = useMemo(
    () => stepValid.map((v, i) => v && i < step),
    [stepValid, step],
  );

  const canNext = stepValid[step];
  const isLast = step === STEPS.length - 1;

  const goNext = () => {
    if (!canNext || isLast) return;
    setDirection(1);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const updateService = (id: string, key: keyof Service, value: string) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const addService = () =>
    setServices((prev) => [...prev, { id: uid(), name: "", price: "", duration: "" }]);

  const removeService = (id: string) =>
    setServices((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((l) => l !== code) : [...prev, code],
    );

  const toggleClosed = (day: string) =>
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );

  const handleFiles = (files: FileList | null, multiple: boolean) => {
    if (!files) return;
    const imgFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (multiple) setGalleryFiles((prev) => [...prev, ...imgFiles]);
    else setCoverFile(imgFiles[0] || null);
  };

  const weekdayToInt = (d: string): number => {
    // Backend model convention is typically 1..7; we map Mon..Sun -> 1..7.
    // If backend ends up using 0..6, we can adjust later without UI changes.
    const idx = WEEKDAYS.indexOf(d as (typeof WEEKDAYS)[number]);
    return idx >= 0 ? idx + 1 : 1;
  };

  const handleSubmit = async () => {
    setErr(null);
    if (!isValid || submitting) return;

    const la = Number(lat);
    const ln = Number(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      setErr("Latitude/Longitude noto‘g‘ri.");
      return;
    }

    // Payload matches backend `SalonCreateUpdateSerializer` (services required on create).
    const payload = {
      name: name.trim(),
      description: description.trim(),
      address: address.trim(),
      phone: phone.trim(),
      latitude: la,
      longitude: ln,
      languages,
      closed_weekdays: closedDays.map(weekdayToInt),
      hours: schedule
        .filter((d) => d.open)
        .map((d) => ({
          weekday: weekdayToInt(d.day),
          open_time: d.from,
          close_time: d.to,
        })),
      services: services.map((s) => ({
        name: s.name.trim(),
        price: s.price,
        duration_minutes: Number(s.duration),
      })),
    };

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/salons/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(formatApiError(body, "Salon yaratilmadi"));
        return;
      }
      const salonId = String((body as { id?: number }).id || "");
      if (!salonId) {
        setErr("Salon ID qaytmadi");
        return;
      }

      if (coverFile) {
        const fd = new FormData();
        fd.set("cover", coverFile);
        await apiFetch(`/api/v1/salons/${encodeURIComponent(salonId)}/upload_cover/`, {
          method: "POST",
          body: fd,
        });
      }

      if (galleryFiles.length) {
        const fd = new FormData();
        for (const f of galleryFiles) fd.append("images", f);
        await apiFetch(`/api/v1/salons/${encodeURIComponent(salonId)}/add_images/`, {
          method: "POST",
          body: fd,
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 1200);

      router.replace("/profile/setup");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <Scissors className="h-4 w-4 text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Barber Studio</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <ProgressBar steps={[...STEPS]} completed={completedSteps} current={step} />
      </header>

      <main className="mx-auto max-w-[900px] px-6 pt-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Create Your Salon
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Set up your salon profile to start accepting clients
          </p>
          {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        </motion.div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
            transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-6"
          >
            {step === 0 && (
              <Section
                icon={<Building2 className="h-4 w-4" />}
                label="01"
                title="Basic Information"
                description="Tell clients who you are."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput
                    label="Salon name"
                    required
                    value={name}
                    onChange={setName}
                    readOnly={Boolean(props.lockSalonName)}
                  />
                  <FloatingInput label="Phone number" value={phone} onChange={setPhone} />
                </div>
                <FloatingInput label="Address" value={address} onChange={setAddress} />
                <FloatingTextarea
                  label="Description"
                  value={description}
                  onChange={setDescription}
                />
              </Section>
            )}

            {step === 1 && (
              <Section
                icon={<MapPin className="h-4 w-4" />}
                label="02"
                title="Location"
                description="Pin your salon on the map."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput label="Latitude" value={lat} onChange={setLat} />
                  <FloatingInput label="Longitude" value={lng} onChange={setLng} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter coordinates to place your salon on map
                </p>
                <div className="relative mt-2 h-44 overflow-hidden rounded-2xl border border-border bg-muted/60">
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
                      backgroundSize: "32px 32px",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <div className="relative">
                        <div className="absolute -inset-3 animate-ping rounded-full bg-foreground/10" />
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background">
                          <MapPin className="h-4 w-4" />
                        </div>
                      </div>
                      <span className="text-xs">Map preview</span>
                    </div>
                  </div>
                </div>
              </Section>
            )}

            {step === 2 && (
              <Section
                icon={<Scissors className="h-4 w-4" />}
                label="03"
                title="Services"
                description="What do you offer?"
              >
                <div className="space-y-3">
                  {/* Quick add presets */}
                  <div className="flex flex-wrap gap-2 pb-1">
                    <span className="mr-1 self-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick add
                    </span>
                    {[
                      { name: "Haircut", price: "20", duration: "30" },
                      { name: "Beard trim", price: "15", duration: "20" },
                      { name: "Shave", price: "18", duration: "25" },
                      { name: "Hair + Beard", price: "32", duration: "45" },
                      { name: "Kids cut", price: "12", duration: "20" },
                    ].map((p) => (
                      <button
                        key={p.name}
                        onClick={() =>
                          setServices((prev) => {
                            const last = prev[prev.length - 1];
                            const empty = last && !last.name && !last.price && !last.duration;
                            const next = { id: uid(), ...p };
                            return empty ? [...prev.slice(0, -1), next] : [...prev, next];
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-[var(--transition-smooth)] hover:border-foreground hover:bg-muted"
                      >
                        <Sparkles className="h-3 w-3" /> {p.name}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence initial={false}>
                    {services.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: -6, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, y: -6, height: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="group rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] transition-[var(--transition-smooth)] hover:border-foreground/30">
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              Service {String(i + 1).padStart(2, "0")}
                            </span>
                            <button
                              onClick={() => removeService(s.id)}
                              disabled={services.length === 1}
                              className="rounded-lg p-1.5 text-muted-foreground transition-[var(--transition-smooth)] hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                              aria-label="Remove service"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
                            <FloatingInput
                              label="Service name"
                              value={s.name}
                              onChange={(v) => updateService(s.id, "name", v)}
                              compact
                            />
                            <FloatingInput
                              label="Price"
                              value={s.price}
                              onChange={(v) => updateService(s.id, "price", v)}
                              compact
                            />
                            <FloatingInput
                              label="Duration (min)"
                              value={s.duration}
                              onChange={(v) => updateService(s.id, "duration", v)}
                              compact
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <button
                    onClick={addService}
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent px-4 py-4 text-sm font-semibold text-foreground transition-[var(--transition-smooth)] hover:border-foreground hover:bg-muted/60 active:scale-[0.99]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover:rotate-90">
                      <Plus className="h-4 w-4" />
                    </span>
                    Add new service
                  </button>
                </div>
              </Section>
            )}

            {step === 3 && (
              <Section
                icon={<Clock className="h-4 w-4" />}
                label="04"
                title="Working Hours"
                description="Tap a day to open it, then set times."
              >
                <WorkingHoursPicker schedule={schedule} setSchedule={setSchedule} />
              </Section>
            )}

            {step === 4 && (
              <Section
                icon={<Globe2 className="h-4 w-4" />}
                label="05"
                title="Additional Settings"
                description="Languages and closed days."
              >
                <div>
                  <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Languages
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((l) => {
                      const active = languages.includes(l.code);
                      return (
                        <button
                          key={l.code}
                          onClick={() => toggleLanguage(l.code)}
                          className={cn(
                            "rounded-full border px-4 py-1.5 text-xs font-medium transition-[var(--transition-smooth)]",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card text-foreground hover:border-foreground/40",
                          )}
                        >
                          {l.code.toUpperCase()}
                          <span className="ml-1.5 opacity-60">{l.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Closed weekdays
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => {
                      const active = closedDays.includes(d);
                      return (
                        <button
                          key={d}
                          onClick={() => toggleClosed(d)}
                          className={cn(
                            "flex h-10 w-12 items-center justify-center rounded-xl border text-xs font-medium transition-[var(--transition-smooth)]",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-card text-foreground hover:border-foreground/40",
                          )}
                        >
                          {d.slice(0, 2)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Section>
            )}

            {step === 5 && (
              <Section
                icon={<ImageIcon className="h-4 w-4" />}
                label="06"
                title="Media"
                description="Upload your cover and gallery."
              >
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Cover image
                  </label>
                  <Dropzone
                    drag={coverDrag}
                    setDrag={setCoverDrag}
                    onFiles={(f) => handleFiles(f, false)}
                  >
                    {coverPreview ? (
                      <div className="relative h-full w-full">
                        <img src={coverPreview} alt="cover" className="h-full w-full object-cover" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverFile(null);
                          }}
                          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/80 text-background opacity-0 backdrop-blur transition-[var(--transition-smooth)] hover:bg-foreground group-hover:opacity-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <DropzoneEmpty label="Drop cover image or click to upload" />
                    )}
                  </Dropzone>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Gallery
                  </label>
                  <Dropzone
                    drag={galleryDrag}
                    setDrag={setGalleryDrag}
                    onFiles={(f) => handleFiles(f, true)}
                    short
                  >
                    <DropzoneEmpty label="Drop multiple images or click to upload" small />
                  </Dropzone>
                  {galleryPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      <AnimatePresence>
                        {galleryPreviews.map((src, i) => (
                          <motion.div
                            key={src}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group relative aspect-square overflow-hidden rounded-xl border border-border"
                          >
                            <img
                              src={src}
                              alt={`gallery-${i}`}
                              className="h-full w-full object-cover"
                            />
                            <button
                              onClick={() =>
                                setGalleryFiles((prev) => prev.filter((_, idx) => idx !== i))
                              }
                              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground/80 text-background opacity-0 backdrop-blur transition-[var(--transition-smooth)] group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </Section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[900px] items-center justify-between gap-3 px-6 py-4">
          <button
            onClick={goBack}
            disabled={step === 0 || submitting}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-[var(--transition-smooth)]",
              step === 0
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-muted hover:scale-[1.02] active:scale-[0.98]",
            )}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <p className="hidden text-xs text-muted-foreground sm:block">
            {canNext ? (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Check className="h-3.5 w-3.5" />
                {isLast ? "Ready to create" : `Step ${step + 1} complete`}
              </span>
            ) : (
              "Please fill required fields"
            )}
          </p>

          {isLast ? (
            <button
              disabled={!isValid || submitting}
              onClick={handleSubmit}
              className={cn(
                "group relative inline-flex h-11 min-w-[160px] items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold transition-[var(--transition-smooth)]",
                isValid && !submitting
                  ? "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : success ? (
                <>
                  <Check className="h-4 w-4" /> Created
                </>
              ) : (
                <>Create Salon</>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canNext}
              className={cn(
                "inline-flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-[var(--transition-smooth)]",
                canNext
                  ? "bg-foreground text-background hover:scale-[1.02] active:scale-[0.98]"
                  : "cursor-not-allowed bg-muted text-muted-foreground",
              )}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ProgressBar({
  steps,
  completed,
  current,
}: {
  steps: string[];
  completed: boolean[];
  current: number;
}) {
  return (
    <div className="mx-auto max-w-[900px] px-6 pb-4">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const done = completed[i];
          const isCurrent = i === current;
          return (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "h-1 flex-1 rounded-full transition-[var(--transition-smooth)]",
                  done ? "bg-foreground" : isCurrent ? "bg-foreground/40" : "bg-border",
                )}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 hidden grid-cols-5 gap-2 sm:grid">
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn(
              "text-[10px] font-medium uppercase tracking-wider",
              i <= current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

function Section({
  icon,
  label,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-background">
          {icon}
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.section>
  );
}

function FloatingInput({
  label,
  value,
  onChange,
  required,
  compact,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  compact?: boolean;
  readOnly?: boolean;
}) {
  const has = value.length > 0;
  return (
    <div className="relative">
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "peer w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-[var(--transition-smooth)] placeholder-transparent focus:border-foreground",
          compact ? "h-11 pt-3.5 pb-1" : "h-14 pt-5 pb-1.5",
          readOnly ? "opacity-90" : "",
        )}
        placeholder={label}
      />
      <label
        className={cn(
          "pointer-events-none absolute left-3.5 text-muted-foreground transition-[var(--transition-smooth)]",
          has || compact
            ? compact
              ? "top-1.5 text-[10px] uppercase tracking-wider"
              : "top-2 text-[10px] uppercase tracking-wider"
            : "top-1/2 -translate-y-1/2 text-sm",
          "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
          compact && "peer-focus:top-1.5",
        )}
      >
        {label}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
    </div>
  );
}

function FloatingTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const has = value.length > 0;
  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="peer w-full resize-none rounded-xl border border-border bg-background px-3.5 pb-3 pt-6 text-sm text-foreground outline-none transition-[var(--transition-smooth)] focus:border-foreground"
        placeholder=" "
      />
      <label
        className={cn(
          "pointer-events-none absolute left-3.5 transition-[var(--transition-smooth)]",
          has
            ? "top-2 text-[10px] uppercase tracking-wider text-muted-foreground"
            : "top-4 text-sm text-muted-foreground",
          "peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-foreground",
        )}
      >
        {label}
      </label>
    </div>
  );
}

function Dropzone({
  drag,
  setDrag,
  onFiles,
  children,
  short,
}: {
  drag: boolean;
  setDrag: (v: boolean) => void;
  onFiles: (files: FileList | null) => void;
  children: React.ReactNode;
  short?: boolean;
}) {
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative block cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed bg-muted/30 transition-[var(--transition-smooth)]",
        drag ? "border-foreground bg-muted" : "border-border hover:border-foreground/40",
        short ? "h-28" : "h-44",
      )}
    >
      <input
        type="file"
        accept="image/*"
        multiple={short}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {children}
    </label>
  );
}

function DropzoneEmpty({ label, small }: { label: string; small?: boolean }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-background",
          small ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        <UploadCloud className={small ? "h-4 w-4" : "h-5 w-5"} />
      </div>
      <span className={cn("font-medium", small ? "text-xs" : "text-sm")}>{label}</span>
      <span className="text-[10px] uppercase tracking-wider">PNG, JPG up to 10MB</span>
    </div>
  );
}

/* ---------- Working Hours Picker ---------- */

const DAY_FULL: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const HOUR_PRESETS = [
  { label: "9–18", from: "09:00", to: "18:00" },
  { label: "10–20", from: "10:00", to: "20:00" },
  { label: "11–22", from: "11:00", to: "22:00" },
  { label: "14–23", from: "14:00", to: "23:00" },
];

function WorkingHoursPicker({
  schedule,
  setSchedule,
}: {
  schedule: DaySchedule[];
  setSchedule: React.Dispatch<React.SetStateAction<DaySchedule[]>>;
}) {
  const [activeDay, setActiveDay] = useState<string | null>(null);

  const update = (day: string, patch: Partial<DaySchedule>) =>
    setSchedule((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)));

  const applyAll = (patch: Partial<DaySchedule>) =>
    setSchedule((prev) => prev.map((d) => ({ ...d, ...patch })));

  const presets = [
    {
      key: "weekdays",
      label: "Weekdays",
      sub: "Mon–Fri · 9–18",
      icon: <Coffee className="h-3.5 w-3.5" />,
      apply: () =>
        setSchedule((prev) =>
          prev.map((d) => ({
            ...d,
            open: !["Sat", "Sun"].includes(d.day),
            from: "09:00",
            to: "18:00",
          })),
        ),
    },
    {
      key: "standard",
      label: "Standard",
      sub: "Mon–Sat · 9–20",
      icon: <Sun className="h-3.5 w-3.5" />,
      apply: () =>
        setSchedule((prev) =>
          prev.map((d) => ({
            ...d,
            open: d.day !== "Sun",
            from: "09:00",
            to: "20:00",
          })),
        ),
    },
    {
      key: "everyday",
      label: "Every day",
      sub: "All week · 10–22",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      apply: () => applyAll({ open: true, from: "10:00", to: "22:00" }),
    },
    {
      key: "evening",
      label: "Evenings",
      sub: "Mon–Sat · 14–23",
      icon: <Moon className="h-3.5 w-3.5" />,
      apply: () =>
        setSchedule((prev) =>
          prev.map((d) => ({
            ...d,
            open: d.day !== "Sun",
            from: "14:00",
            to: "23:00",
          })),
        ),
    },
  ];

  const openCount = schedule.filter((d) => d.open).length;

  return (
    <div className="space-y-5">
      {/* Presets */}
      <div>
        <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick presets
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={p.apply}
              className="group flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left transition-[var(--transition-smooth)] hover:border-foreground hover:shadow-[var(--shadow-soft)] active:scale-[0.98]"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-foreground transition-[var(--transition-smooth)] group-hover:bg-foreground group-hover:text-background">
                {p.icon}
              </span>
              <span className="text-xs font-semibold text-foreground">{p.label}</span>
              <span className="text-[10px] text-muted-foreground">{p.sub}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-2.5">
        <span className="text-xs font-medium text-foreground">
          {openCount} {openCount === 1 ? "day" : "days"} open
        </span>
        <button
          onClick={() => applyAll({ open: false })}
          className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        >
          Close all
        </button>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {schedule.map((d) => {
          const isActive = activeDay === d.day;
          return (
            <motion.button
              key={d.day}
              layout
              onClick={() => {
                if (!d.open) {
                  update(d.day, { open: true });
                  setActiveDay(d.day);
                } else if (isActive) {
                  setActiveDay(null);
                } else {
                  setActiveDay(d.day);
                }
              }}
              className={cn(
                "relative flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-[var(--transition-smooth)]",
                d.open
                  ? isActive
                    ? "border-foreground bg-foreground text-background shadow-[var(--shadow-pop)]"
                    : "border-border bg-card text-foreground hover:border-foreground/50"
                  : "border-dashed border-border bg-muted/30 text-muted-foreground hover:border-foreground/30",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  {d.day}
                </span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    d.open
                      ? isActive
                        ? "bg-background"
                        : "bg-foreground"
                      : "bg-muted-foreground/40",
                  )}
                />
              </div>
              {d.open ? (
                <span
                  className={cn(
                    "text-[13px] font-semibold tabular-nums",
                    isActive ? "text-background" : "text-foreground",
                  )}
                >
                  {d.from}–{d.to}
                </span>
              ) : (
                <span className="text-[11px] font-medium">Closed</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Inline editor for active day */}
      <AnimatePresence initial={false}>
        {activeDay && (
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            {(() => {
              const day = schedule.find((d) => d.day === activeDay);
              if (!day) return null;
              return (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Editing
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {DAY_FULL[day.day]}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        update(day.day, { open: false });
                        setActiveDay(null);
                      }}
                      className="rounded-lg border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:border-foreground hover:text-foreground"
                    >
                      Set closed
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-border bg-background p-2.5">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Opens
                      </div>
                      <input
                        type="time"
                        value={day.from}
                        onChange={(e) => update(day.day, { from: e.target.value })}
                        className="w-full bg-transparent text-base font-semibold tabular-nums text-foreground outline-none"
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-background p-2.5">
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Closes
                      </div>
                      <input
                        type="time"
                        value={day.to}
                        onChange={(e) => update(day.day, { to: e.target.value })}
                        className="w-full bg-transparent text-base font-semibold tabular-nums text-foreground outline-none"
                      />
                    </div>
                  </div>

                  {/* Hour quick presets */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {HOUR_PRESETS.map((h) => {
                      const active = day.from === h.from && day.to === h.to;
                      return (
                        <button
                          key={h.label}
                          onClick={() => update(day.day, { from: h.from, to: h.to })}
                          className={cn(
                            "rounded-full border px-3 py-1 text-[11px] font-semibold transition-[var(--transition-smooth)]",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-border bg-background text-foreground hover:border-foreground/50",
                          )}
                        >
                          {h.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      applyAll({ from: day.from, to: day.to });
                    }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background py-2 text-[11px] font-semibold uppercase tracking-wider text-foreground transition-[var(--transition-smooth)] hover:border-foreground hover:bg-muted"
                  >
                    <Copy className="h-3 w-3" /> Apply to all days
                  </button>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

