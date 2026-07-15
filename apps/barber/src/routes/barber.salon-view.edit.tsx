import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Phone,
  Save,
  Store,
  FileText,
} from "lucide-react";
import { useBarberContext } from "@/components/barber/BarberContext";
import { SalonLocationPicker } from "@/components/map/SalonLocationPicker";
import { toast } from "sonner";

export const Route = createFileRoute("/barber/salon-view/edit")({
  component: SalonEditPage,
});

function SalonEditPage() {
  const navigate = useNavigate();
  const {
    salon,
    ownsSalon,
    isJoinedWorker,
    activationHydrated,
    updateSalonProfile,
    refreshSalonView,
  } = useBarberContext();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void refreshSalonView();
  }, [refreshSalonView]);

  useEffect(() => {
    setName(salon.name || "");
    setDescription(salon.description || "");
    setPhone(salon.phone || "");
    setAddress(salon.address || "");
    setLatitude(salon.latitude || "");
    setLongitude(salon.longitude || "");
  }, [salon]);

  if (!activationHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Yuklanmoqda…</p>
      </div>
    );
  }

  if (isJoinedWorker || !ownsSalon) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4">
        <p className="text-sm text-muted-foreground">
          Salon maʼlumotlarini faqat egasi tahrirlashi mumkin.
        </p>
        <Link to="/barber/salon-view" className="text-sm underline">
          Ortga
        </Link>
      </div>
    );
  }

  const onSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Salon nomi majburiy.");
      return;
    }
    if (!address.trim()) {
      toast.error("Manzilni kiriting.");
      return;
    }
    setSaving(true);
    const result = await updateSalonProfile({
      name: trimmedName,
      description: description.trim(),
      phone: phone.trim(),
      address: address.trim(),
      latitude: latitude || null,
      longitude: longitude || null,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("Salon maʼlumotlari saqlandi.");
      void navigate({ to: "/barber/salon-view" });
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <Link
          to="/barber/salon-view"
          className="mt-1 size-9 rounded-lg border border-border bg-card inline-flex items-center justify-center hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-semibold">Salonni tahrirlash</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Nom, manzil, telefon va tavsif — mijozlar shuni ko‘radi.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
            <Store className="size-3.5" />
            Salon nomi
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            placeholder="Masalan: Barbershop Premium"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
            <Phone className="size-3.5" />
            Telefon
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            placeholder="+998 90 123 45 67"
            inputMode="tel"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
            <FileText className="size-3.5" />
            Tavsif
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm resize-y min-h-[100px]"
            placeholder="Salon haqida qisqa: uslub, tajriba, nima bilan ajralib turadi…"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold inline-flex items-center gap-2">
            <MapPin className="size-4" />
            Manzil va xarita
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Aniq pin qo‘ying — mijozlar yaqin atrofdan topishi osonlashadi.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Shahar / tuman</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full h-11 px-3 rounded-xl bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm"
            placeholder="Toshkent, Chilonzor…"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">To‘liq manzil</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border focus:bg-background focus:ring-2 focus:ring-ring outline-none text-sm resize-none"
            placeholder="Ko‘cha, uy, orientir"
          />
        </label>

        <SalonLocationPicker
          city={city}
          address={address}
          latitude={latitude}
          longitude={longitude}
          setLatitude={setLatitude}
          setLongitude={setLongitude}
          setAddress={setAddress}
          setCity={setCity}
          mapClassName="h-52 sm:h-64"
        />
      </section>

      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground text-sm">Tavsiyalar</p>
        <ul className="list-disc pl-4 space-y-1 text-xs">
          <li>Nom qisqa va esda qolarli bo‘lsin.</li>
          <li>Manzilda orientir yozing (masalan, metro yonida).</li>
          <li>Tavsifda 2–3 kuchli jihatni ayting (tezlik, uslub, muhit).</li>
          <li>Galereyaga yorug‘ interyer va ish namunalarini qo‘shing.</li>
        </ul>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void onSave()}
        className="w-full h-12 rounded-xl bg-foreground text-background text-sm font-medium inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Saqlash
      </button>
    </div>
  );
}
