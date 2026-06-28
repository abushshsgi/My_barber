import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { EmptyBlock, PageHeader, SectionCard } from "@/components/barber/primitives";
import { useBarberContext } from "@/components/barber/BarberContext";
import { apiFetch, formatApiError } from "@/lib/api";
import { amenityIcon } from "@/lib/amenity-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/barber/amenities")({
  component: BarberAmenitiesPage,
});

type AmenityItem = {
  code: string;
  icon: string;
  label: string;
};

type AmenitiesPayload = {
  salon_id: number;
  venue_kind?: "solo_studio" | "salon";
  can_edit: boolean;
  selected_codes: string[];
  catalog: AmenityItem[];
};

function BarberAmenitiesPage() {
  const { ownsSalon, activeSalonId, salon, profile } = useBarberContext();
  const salonPk = activeSalonId ?? (salon.id ? Number(salon.id) : null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [venueKind, setVenueKind] = useState<"solo_studio" | "salon">("solo_studio");
  const [catalog, setCatalog] = useState<AmenityItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState("");

  const load = useCallback(async () => {
    if (!salonPk) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/barber/amenities/?salon=${salonPk}`);
      const body = (await res.json().catch(() => ({}))) as AmenitiesPayload & { detail?: string };
      if (!res.ok) {
        throw new Error(formatApiError(body, "Ma'lumotlarni yuklashda xatolik"));
      }
      setCatalog(body.catalog ?? []);
      const codes = new Set(body.selected_codes ?? []);
      setSelected(codes);
      setBaseline(JSON.stringify([...(body.selected_codes ?? [])].sort()));
      setCanEdit(Boolean(body.can_edit));
      setVenueKind(body.venue_kind === "salon" ? "salon" : "solo_studio");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }, [salonPk]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(
    () => baseline !== JSON.stringify([...selected].sort()),
    [baseline, selected],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (a) => a.label.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
    );
  }, [catalog, query]);

  const subtitle =
    venueKind === "solo_studio"
      ? "Brend sahifangizda mijozlar uchun nimalar bor — ixtiyoriy, lekin ishonch oshiradi."
      : "Salon sahifasida mijozlar ko'radigan qulayliklar.";

  const toggle = (code: string) => {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const save = async () => {
    if (!salonPk || !canEdit) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/v1/barber/amenities/", {
        method: "PUT",
        body: JSON.stringify({
          salon: salonPk,
          amenity_codes: [...selected],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(formatApiError(body, "Saqlashda xatolik"));
      }
      const codes = (body as AmenitiesPayload).selected_codes ?? [...selected];
      setSelected(new Set(codes));
      setBaseline(JSON.stringify([...codes].sort()));
      toast.success("Saqlandi");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  };

  if (!salonPk) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mijozlar uchun" subtitle="Joyingiz va xizmatlar haqida qisqa ma'lumot" />
        <EmptyBlock
          title="Salon topilmadi"
          description="Avval brend sahifangizni yarating — keyin mijozlar uchun bandlarni tanlaysiz."
          action={
            ownsSalon ? (
              <Button asChild>
                <Link to="/salon/create">Brend yaratish</Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  if (!ownsSalon) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mijozlar uchun" subtitle={subtitle} />
        <EmptyBlock
          title="Faqat salon egasi"
          description="Bandlarni faqat salon egasi tanlaydi. Siz ishlayotgan joy qulayliklari mijozlarga avtomatik ko'rinadi."
          action={
            <Button asChild variant="outline">
              <Link to="/barber/salon-view">Salon sahifasiga</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Mijozlar uchun"
        description={
          canEdit
            ? `${profile.name || salon.name || "Brend"} — ${subtitle}`
            : "Faqat ko'rish rejimi"
        }
        actions={
          canEdit ? (
            <Button onClick={() => void save()} disabled={!dirty || saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Saqlash
            </Button>
          ) : null
        }
      />

      <SectionCard>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qidirish..."
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-foreground"
            />
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{selected.size}</span> / {catalog.length}{" "}
            tanlangan · ixtiyoriy
          </p>
        </div>
      </SectionCard>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const Icon = amenityIcon(item.icon);
            const on = selected.has(item.code);
            return (
              <button
                key={item.code}
                type="button"
                disabled={!canEdit}
                onClick={() => toggle(item.code)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                  on ? "border-foreground bg-muted/40" : "border-border bg-card hover:bg-muted/20",
                  !canEdit && "cursor-default opacity-90",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-xl",
                    on ? "bg-foreground text-background" : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug">{item.label}</span>
                </span>
                {on ? (
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-background">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="size-6 shrink-0 rounded-full border border-border" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 ? (
        <EmptyBlock
          icon={<Sparkles className="size-5" />}
          title="Topilmadi"
          description="Boshqa kalit so'z bilan qidiring."
        />
      ) : null}

      {canEdit && dirty ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl gap-3">
            <Button variant="outline" className="flex-1" onClick={() => void load()} disabled={saving}>
              Bekor qilish
            </Button>
            <Button className="flex-[2]" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Saqlash ({selected.size})
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
