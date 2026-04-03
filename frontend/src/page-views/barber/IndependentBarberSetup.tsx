"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken } from "@/lib/api";
import { mediaSrc, PLACEHOLDER_SALON } from "@/lib/media";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Save, Image as ImageIcon, Clock } from "lucide-react";
import { motion } from "framer-motion";

type MyProfile = {
  exists: boolean;
  id?: number;
  location_text?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type ServiceRow = {
  id: number;
  name: string;
  price: string;
  duration_minutes: number;
  is_active: boolean;
};

type WorkPhotoRow = {
  id: number;
  image: string;
  sort_order: number;
  created_at: string;
};

type HoursRow = {
  id: number;
  weekday: number;
  open_time: string;
  close_time: string;
  is_day_off: boolean;
};

const WEEKDAYS: { id: number; label: string }[] = [
  { id: 0, label: "Du" },
  { id: 1, label: "Se" },
  { id: 2, label: "Cho" },
  { id: 3, label: "Pa" },
  { id: 4, label: "Ju" },
  { id: 5, label: "Sha" },
  { id: 6, label: "Ya" },
];

async function fetchMyProfile(): Promise<MyProfile> {
  const res = await apiFetch("/api/v1/barber/profile/");
  if (!res.ok) throw new Error("Profil yuklanmadi");
  return res.json() as Promise<MyProfile>;
}

async function fetchMyServices(): Promise<ServiceRow[]> {
  const res = await apiFetch("/api/v1/barber/services/");
  if (!res.ok) throw new Error("Xizmatlar yuklanmadi");
  const j = (await res.json()) as { results?: ServiceRow[] } | ServiceRow[];
  return Array.isArray(j) ? j : j.results || [];
}

async function fetchMyWorkPhotos(): Promise<WorkPhotoRow[]> {
  const res = await apiFetch("/api/v1/barber/work-photos/");
  if (!res.ok) return [];
  const j = (await res.json()) as { results?: WorkPhotoRow[] } | WorkPhotoRow[];
  return Array.isArray(j) ? j : j.results || [];
}

async function fetchMyHours(): Promise<HoursRow[]> {
  const res = await apiFetch("/api/v1/barber/working-hours/");
  if (!res.ok) return [];
  const j = (await res.json()) as { results?: HoursRow[] } | HoursRow[];
  return Array.isArray(j) ? j : j.results || [];
}

export default function IndependentBarberSetup() {
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace(`/auth?next=${encodeURIComponent("/barber/independent/setup")}`);
    }
  }, [router]);

  const { data: profile, isLoading: lp, error: ep } = useQuery({
    queryKey: ["barber", "me", "profile"],
    queryFn: fetchMyProfile,
    enabled: !!getAccessToken(),
  });

  const { data: services = [], isLoading: ls } = useQuery({
    queryKey: ["barber", "me", "services"],
    queryFn: fetchMyServices,
    enabled: !!getAccessToken(),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["barber", "me", "work-photos"],
    queryFn: fetchMyWorkPhotos,
    enabled: !!getAccessToken(),
  });

  const { data: hours = [] } = useQuery({
    queryKey: ["barber", "me", "hours"],
    queryFn: fetchMyHours,
    enabled: !!getAccessToken(),
  });

  const [locationText, setLocationText] = useState("");
  const [lat, setLat] = useState("41.3111");
  const [lng, setLng] = useState("69.2797");

  useEffect(() => {
    if (!profile?.exists) return;
    setLocationText(profile.location_text || "");
    setLat(profile.latitude ? String(profile.latitude) : "41.3111");
    setLng(profile.longitude ? String(profile.longitude) : "69.2797");
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/v1/barber/profile/", {
        method: "PATCH",
        body: JSON.stringify({
          location_text: locationText.trim(),
          latitude: lat ? parseFloat(lat) : null,
          longitude: lng ? parseFloat(lng) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { detail?: string }).detail || "Saqlanmadi");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "me", "profile"] }),
  });

  const addService = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/v1/barber/services/", {
        method: "POST",
        body: JSON.stringify({ name: "Yangi xizmat", price: "0", duration_minutes: 30, is_active: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { detail?: string }).detail || "Xizmat qo‘shilmadi");
      return data as ServiceRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "me", "services"] }),
  });

  const updateService = useMutation({
    mutationFn: async (s: ServiceRow) => {
      const res = await apiFetch(`/api/v1/barber/services/${s.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
          is_active: s.is_active,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { detail?: string }).detail || "Saqlanmadi");
      return data as ServiceRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "me", "services"] }),
  });

  const deleteService = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/barber/services/${id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("O‘chirilmadi");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "me", "services"] }),
  });

  const uploadPhotos = useMutation({
    mutationFn: async (files: FileList) => {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("image", f);
        const res = await apiFetch("/api/v1/barber/work-photos/", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Rasm yuklanmadi");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "me", "work-photos"] }),
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/v1/barber/work-photos/${id}/`, { method: "DELETE" });
      if (!res.ok) throw new Error("O‘chirilmadi");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "me", "work-photos"] }),
  });

  const hoursByDay = useMemo(() => {
    const map = new Map<number, HoursRow>();
    for (const h of hours) map.set(h.weekday, h);
    return map;
  }, [hours]);

  const [hoursDraft, setHoursDraft] = useState<Record<number, { open: string; close: string; off: boolean }>>({});
  useEffect(() => {
    const next: Record<number, { open: string; close: string; off: boolean }> = {};
    for (const d of WEEKDAYS) {
      const h = hoursByDay.get(d.id);
      next[d.id] = {
        open: h?.open_time?.slice(0, 5) || "09:00",
        close: h?.close_time?.slice(0, 5) || "18:00",
        off: h?.is_day_off || false,
      };
    }
    setHoursDraft(next);
  }, [hoursByDay]);

  const saveHours = useMutation({
    mutationFn: async () => {
      for (const d of WEEKDAYS) {
        const draft = hoursDraft[d.id];
        const existing = hoursByDay.get(d.id);
        const payload = {
          weekday: d.id,
          open_time: `${draft.open}:00`,
          close_time: `${draft.close}:00`,
          is_day_off: draft.off,
        };
        if (existing) {
          await apiFetch(`/api/v1/barber/working-hours/${existing.id}/`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch("/api/v1/barber/working-hours/", {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["barber", "me", "hours"] }),
  });

  if (lp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (ep) {
    return (
      <div className="min-h-screen p-6 text-center text-destructive">
        {(ep as Error).message}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-8 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-extrabold text-foreground"
        >
          Barber profilini sozlash
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xizmatlaringizni kiriting — userlar shu orqali bron qiladi.
        </p>
      </div>

      <div className="px-5 space-y-3">
        <Card className="p-4 rounded-2xl">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Save className="h-4 w-4 text-accent" /> Profil
          </p>
          <div className="space-y-2">
            <Textarea
              className="rounded-xl"
              placeholder="Manzil / lokatsiya (masalan: Chilonzor, Toshkent)"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input className="rounded-xl" placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
              <Input className="rounded-xl" placeholder="Longitude" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
            <Button
              className="rounded-xl gold-gradient text-gold-foreground border-0"
              disabled={saveProfile.isPending}
              onClick={() => saveProfile.mutate()}
            >
              {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Saqlash"}
            </Button>
          </div>
        </Card>

        <Card className="p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">Xizmatlar</p>
            <Button
              size="sm"
              className="rounded-xl gold-gradient text-gold-foreground border-0"
              disabled={addService.isPending}
              onClick={() => addService.mutate()}
            >
              <Plus className="h-4 w-4 mr-1" /> Qo‘shish
            </Button>
          </div>

          {ls && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}

          {!ls && services.length === 0 && (
            <p className="text-sm text-muted-foreground">Hozircha xizmat yo‘q. Qo‘shing.</p>
          )}

          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="border border-border/60 rounded-2xl p-3 space-y-2">
                <Input
                  className="rounded-xl"
                  value={s.name}
                  onChange={(e) => {
                    qc.setQueryData<ServiceRow[]>(["barber", "me", "services"], (prev) =>
                      (prev || []).map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x))
                    );
                  }}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    className="rounded-xl"
                    placeholder="Narx"
                    value={s.price}
                    onChange={(e) => {
                      qc.setQueryData<ServiceRow[]>(["barber", "me", "services"], (prev) =>
                        (prev || []).map((x) => (x.id === s.id ? { ...x, price: e.target.value } : x))
                      );
                    }}
                  />
                  <Input
                    className="rounded-xl"
                    placeholder="Daqiqa"
                    value={String(s.duration_minutes)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value || "0", 10) || 0;
                      qc.setQueryData<ServiceRow[]>(["barber", "me", "services"], (prev) =>
                        (prev || []).map((x) => (x.id === s.id ? { ...x, duration_minutes: v } : x))
                      );
                    }}
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      const next = { ...s, is_active: !s.is_active };
                      updateService.mutate(next);
                    }}
                  >
                    {s.is_active ? "Faol" : "Nofaol"}
                  </Button>
                </div>
                <div className="flex justify-between gap-2">
                  <Button
                    className="rounded-xl"
                    onClick={() => updateService.mutate(s)}
                    disabled={updateService.isPending}
                  >
                    Saqlash
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-xl text-destructive hover:text-destructive"
                    onClick={() => deleteService.mutate(s.id)}
                    disabled={deleteService.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> O‘chirish
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 rounded-2xl">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-accent" /> Ish rasmlari
          </p>
          <Input
            className="rounded-xl"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length) uploadPhotos.mutate(e.target.files);
            }}
          />
          <div className="grid grid-cols-3 gap-2 mt-3">
            {photos.map((p) => (
              <div key={p.id} className="relative rounded-xl overflow-hidden border border-border/50">
                <img src={mediaSrc(p.image, PLACEHOLDER_SALON)} alt="work" className="w-full h-24 object-cover" />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-foreground/80 text-background rounded-lg px-2 py-1 text-[10px]"
                  onClick={() => deletePhoto.mutate(p.id)}
                >
                  O‘chirish
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 rounded-2xl">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> Ish vaqti
          </p>
          <div className="space-y-2">
            {WEEKDAYS.map((d) => {
              const dr = hoursDraft[d.id] || { open: "09:00", close: "18:00", off: false };
              return (
                <div key={d.id} className="border border-border/60 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{d.label}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl h-8"
                      onClick={() =>
                        setHoursDraft((prev) => ({ ...prev, [d.id]: { ...dr, off: !dr.off } }))
                      }
                    >
                      {dr.off ? "Dam" : "Ish"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      className="rounded-xl"
                      type="time"
                      disabled={dr.off}
                      value={dr.open}
                      onChange={(e) =>
                        setHoursDraft((prev) => ({ ...prev, [d.id]: { ...dr, open: e.target.value } }))
                      }
                    />
                    <Input
                      className="rounded-xl"
                      type="time"
                      disabled={dr.off}
                      value={dr.close}
                      onChange={(e) =>
                        setHoursDraft((prev) => ({ ...prev, [d.id]: { ...dr, close: e.target.value } }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            className="mt-3 rounded-xl gold-gradient text-gold-foreground border-0"
            disabled={saveHours.isPending}
            onClick={() => saveHours.mutate()}
          >
            {saveHours.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ish vaqtini saqlash"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

