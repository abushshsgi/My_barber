import { createFileRoute } from "@tanstack/react-router";
import { Check, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AddressForm,
  addressToForm,
  emptyAddressForm,
  type AddressFormValues,
} from "@/components/address/AddressForm";
import { EmptyState } from "@/components/EmptyState";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import {
  useCreateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
  useUpdateAddress,
  useUserAddresses,
} from "@/hooks/use-addresses";
import { useMe } from "@/hooks/use-me";
import { useRegions } from "@/hooks/use-regions";
import type { ApiUserAddress } from "@/lib/api/addresses";
import { parseSubpageBackTo } from "@/lib/subpage-back";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/addresses")({
  validateSearch: (search: Record<string, unknown>) => ({
    backTo: typeof search.backTo === "string" ? search.backTo : undefined,
  }),
  head: () => ({ meta: [{ title: "Manzillarim — mysaloon.uz" }] }),
  component: AddressesPage,
});

type EditorMode = { type: "add" } | { type: "edit"; id: number };

function AddressCard({
  addr,
  regionLabel,
  onEdit,
  onDelete,
  onSetDefault,
  busy,
}: {
  addr: ApiUserAddress;
  regionLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const hasGps = addr.latitude != null && addr.longitude != null;

  return (
    <ProfileSubpageCard className={cn(addr.is_default && "ring-2 ring-foreground/15")}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">{addr.display_label}</p>
            {addr.is_default ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-background">
                <Star className="h-3 w-3 fill-current" />
                {t("addresses.default")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{regionLabel}</p>
          <p className="mt-1 text-sm leading-snug">{addr.address_line}</p>
          {hasGps ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              GPS: {Number(addr.latitude).toFixed(4)}, {Number(addr.longitude).toFixed(4)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {!addr.is_default ? (
          <button
            type="button"
            disabled={busy}
            onClick={onSetDefault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
          >
            <Check className="h-3.5 w-3.5" />
            {t("addresses.useDefault", { defaultValue: "Asosiy qilish" })}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t("addresses.edit", { defaultValue: "O'zgartirish" })}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("addresses.delete", { defaultValue: "O'chirish" })}
        </button>
      </div>
    </ProfileSubpageCard>
  );
}

function AddressesPage() {
  const { t } = useTranslation();
  const { backTo: backToParam } = Route.useSearch();
  const backTo = parseSubpageBackTo({ backTo: backToParam });
  const { data: me } = useMe();
  const { data: regions = [] } = useRegions();
  const { data: addresses = [], isLoading } = useUserAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

  const [editor, setEditor] = useState<EditorMode | null>(null);

  const regionMap = useMemo(
    () => Object.fromEntries(regions.map((r) => [r.value, r.label])),
    [regions],
  );

  const editorInitial: Partial<AddressFormValues> | undefined = useMemo(() => {
    if (!editor) return undefined;
    if (editor.type === "add") {
      const defaultAddr = addresses.find((a) => a.is_default);
      return emptyAddressForm(defaultAddr?.region || me?.region || "");
    }
    const addr = addresses.find((a) => a.id === editor.id);
    return addr ? addressToForm(addr) : undefined;
  }, [editor, addresses, me?.region]);

  const busy =
    createAddress.isPending ||
    updateAddress.isPending ||
    deleteAddress.isPending ||
    setDefault.isPending;

  const openAdd = () => setEditor({ type: "add" });

  const handleSubmit = async (payload: Parameters<typeof createAddress.mutateAsync>[0]) => {
    try {
      if (editor?.type === "edit") {
        await updateAddress.mutateAsync({ id: editor.id, data: payload });
        toast.success(t("addresses.updated", { defaultValue: "Manzil yangilandi" }));
      } else {
        await createAddress.mutateAsync(payload);
        toast.success(t("addresses.saved", { defaultValue: "Manzil saqlandi" }));
      }
      setEditor(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Xatolik");
    }
  };

  return (
    <ProfileSubpageLayout title={t("addresses.title")} subtitle={t("addresses.hint")} backTo={backTo}>
      {editor ? (
        <ProfileSubpageCard>
          <h2 className="mb-4 text-base font-bold">
            {editor.type === "add"
              ? t("addresses.add")
              : t("addresses.edit", { defaultValue: "Manzilni tahrirlash" })}
          </h2>
          <AddressForm
            key={editor.type === "edit" ? editor.id : "new"}
            initial={editorInitial}
            busy={busy}
            regionSyncMode="fill-empty"
            onCancel={() => setEditor(null)}
            onSubmit={handleSubmit}
          />
        </ProfileSubpageCard>
      ) : (
        <>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : addresses.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-7 w-7" />}
              title={t("addresses.empty", { defaultValue: "Saqlangan manzillar yo'q" })}
              description={t("addresses.emptyHint", {
                defaultValue: "Yaqin salonlarni aniqroq topish uchun manzil qo'shing.",
              })}
            />
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <AddressCard
                  key={addr.id}
                  addr={addr}
                  regionLabel={regionMap[addr.region] ?? addr.region}
                  busy={busy}
                  onEdit={() => setEditor({ type: "edit", id: addr.id })}
                  onSetDefault={() => {
                    void setDefault.mutateAsync(addr.id).then(() => {
                      toast.success(
                        t("addresses.defaultChanged", {
                          defaultValue: "Asosiy manzil yangilandi — tavsiyalar yangilandi",
                        }),
                      );
                    });
                  }}
                  onDelete={() => {
                    if (!window.confirm(t("addresses.deleteConfirm", { defaultValue: "O'chirilsinmi?" })))
                      return;
                    void deleteAddress.mutateAsync(addr.id).then(() => {
                      toast.success(t("addresses.deleted", { defaultValue: "Manzil o'chirildi" }));
                    });
                  }}
                />
              ))}
            </div>
          )}

          <ProfileSubpageCard className="mt-4 space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={openAdd}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-bold text-background disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t("addresses.add")}
            </button>
          </ProfileSubpageCard>
        </>
      )}
    </ProfileSubpageLayout>
  );
}
