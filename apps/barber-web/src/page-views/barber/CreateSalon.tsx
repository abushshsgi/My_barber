"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, PartyPopper, Loader2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { apiFetch, formatApiError } from "@/lib/api";

const DAYS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"] as const;
const DAY_TO_W: Record<string, number> = {
  Du: 0,
  Se: 1,
  Cho: 2,
  Pa: 3,
  Ju: 4,
  Sha: 5,
  Ya: 6,
};

const LANGS = ["O'zbek", "Rus", "Ingliz"] as const;

function padTime(t: string): string {
  if (t.length === 5 && t.includes(":")) return `${t}:00`;
  return t;
}

type ServiceItem = { id: string; name: string; price: string; duration: string };

export default function CreateSalon() {
  const router = useRouter();
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [createdSalonId, setCreatedSalonId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("41.3111");
  const [lng, setLng] = useState("69.2797");
  const [openTime, setOpenTime] = useState("09:00");
  const [closeTime, setCloseTime] = useState("21:00");
  const [workDays, setWorkDays] = useState<string[]>(["Du", "Se", "Cho", "Pa", "Ju", "Sha"]);
  const [langs, setLangs] = useState<string[]>(["O'zbek"]);

  const [services, setServices] = useState<ServiceItem[]>([
    { id: "1", name: "", price: "", duration: "30" },
  ]);

  const addService = () => {
    setServices([...services, { id: Date.now().toString(), name: "", price: "", duration: "30" }]);
  };

  const removeService = (id: string) => {
    if (services.length > 1) setServices(services.filter((s) => s.id !== id));
  };

  const toggleDay = (d: string) => {
    setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const toggleLang = (lang: string) => {
    setLangs((prev) =>
      prev.includes(lang) ? prev.filter((x) => x !== lang) : [...prev, lang]
    );
  };

  const requestLocation = () => {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setErr("Brauzer geolokatsiyani qo‘llab-quvvatlamaydi.");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("error");
        setErr("Joylashuv olinmadi. Ruxsat bering yoki lat/lng ni qo‘lda kiriting.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    setErr(null);
    if (!name.trim()) {
      setErr("Salon nomini kiriting");
      return;
    }
    if (workDays.length === 0) {
      setErr("Kamida bitta ish kunini tanlang");
      return;
    }
    const filled = services.filter((s) => s.name.trim() && s.price.trim());
    if (filled.length === 0) {
      setErr("Kamida bitta xizmat qo‘shing");
      return;
    }
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) {
      setErr("Salon joylashuvini kiriting (latitude / longitude).");
      return;
    }
    if (!(-90 <= la && la <= 90) || !(-180 <= ln && ln <= 180)) {
      setErr("latitude / longitude noto‘g‘ri.");
      return;
    }

    const selectedWeekdayInts = new Set(workDays.map((d) => DAY_TO_W[d]));
    const closed_weekdays = [0, 1, 2, 3, 4, 5, 6].filter((w) => !selectedWeekdayInts.has(w));

    const hours = workDays.map((d) => ({
      weekday: DAY_TO_W[d],
      open_time: padTime(openTime),
      close_time: padTime(closeTime),
    }));

    const servicesPayload = filled.map((s) => {
      const raw = String(s.price).replace(/\s/g, "").replace(",", ".");
      return {
        name: s.name.trim(),
        price: raw,
        duration_minutes: parseInt(s.duration, 10) || 30,
      };
    });

    setLoading(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim(),
        latitude: lat,
        longitude: lng,
        address: address.trim(),
        phone: phone.trim(),
        languages: langs.length ? langs : ["O'zbek"],
        closed_weekdays,
        hours,
        services: servicesPayload,
      };

      const res = await apiFetch("/api/v1/salons/", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(data, "Salon yaratilmadi"));
      }
      const salonId = (data as { id: number }).id;

      confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });
      await qc.invalidateQueries({ queryKey: ["salons", "mine"] });
      setCreatedSalonId(salonId);
      setSubmitted(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex flex-col items-center justify-center p-8 text-center px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.15 }}
        >
          <PartyPopper className="h-20 w-20 text-accent mx-auto mb-6" />
        </motion.div>
        <h1 className="text-2xl font-bold mb-2">Salon yaratildi</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          Saloningiz endi mijozlarga ko‘rinadi. Rasmlar qo‘shish va boshqarish uchun salon sahifasiga kiring.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {createdSalonId != null && (
            <Button
              onClick={() => router.push(`/barber/salon/${createdSalonId}`)}
              className="rounded-xl gold-gradient text-gold-foreground border-0 w-full"
            >
              Salonni ochish (rasmlar)
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push("/barber")} className="rounded-xl w-full">
            Dashboardga o‘tish
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b px-4 py-3">
        <h1 className="text-lg font-bold">Salon yaratish</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ma&apos;lumotlarni to&apos;ldirib, saloningizni oching
        </p>
      </div>

      <div className="p-4 space-y-4">
        {err && <p className="text-sm text-destructive text-center">{err}</p>}

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Asosiy ma&apos;lumotlar</h3>
          <Input
            placeholder="Salon nomi *"
            className="rounded-xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Tavsif"
            className="rounded-xl"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            placeholder="Manzil"
            className="rounded-xl"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            placeholder="Salon telefoni (ixtiyoriy)"
            className="rounded-xl"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} className="rounded-xl text-sm" />
            <Input placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} className="rounded-xl text-sm" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl gap-2"
            disabled={geoStatus === "loading"}
            onClick={requestLocation}
          >
            {geoStatus === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Joylashuvni olish
          </Button>
          {geoStatus === "ok" && (
            <p className="text-xs text-success">Joylashuv yangilandi.</p>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Xizmatlar *</h3>
          <AnimatePresence>
            {services.map((svc) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 items-start"
              >
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Xizmat nomi"
                    className="rounded-xl text-sm"
                    value={svc.name}
                    onChange={(e) =>
                      setServices((prev) =>
                        prev.map((x) => (x.id === svc.id ? { ...x, name: e.target.value } : x))
                      )
                    }
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Narx (so'm)"
                      type="number"
                      className="rounded-xl text-sm"
                      value={svc.price}
                      onChange={(e) =>
                        setServices((prev) =>
                          prev.map((x) => (x.id === svc.id ? { ...x, price: e.target.value } : x))
                        )
                      }
                    />
                    <Input
                      placeholder="Daqiqa"
                      type="number"
                      className="rounded-xl text-sm w-24"
                      value={svc.duration}
                      onChange={(e) =>
                        setServices((prev) =>
                          prev.map((x) => (x.id === svc.id ? { ...x, duration: e.target.value } : x))
                        )
                      }
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeService(svc.id)}
                  className="p-2 text-destructive/60 hover:text-destructive mt-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button variant="outline" type="button" onClick={addService} className="w-full rounded-xl border-dashed">
            <Plus className="h-4 w-4 mr-1" /> Xizmat qo‘shish
          </Button>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Ish kunlari</h3>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                  workDays.includes(d) ? "gold-gradient text-gold-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="rounded-xl" />
            <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="rounded-xl" />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Tillar</h3>
          <div className="flex gap-2 flex-wrap">
            {LANGS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLang(lang)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  langs.includes(lang)
                    ? "gold-gradient text-gold-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </Card>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-xl gold-gradient text-gold-foreground border-0 text-base font-semibold shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin inline" /> Yuborilmoqda...
            </>
          ) : (
            "Salon yaratish"
          )}
        </Button>
      </div>
    </div>
  );
}
