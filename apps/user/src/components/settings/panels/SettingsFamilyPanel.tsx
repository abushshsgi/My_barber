import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";
import {
  useCreateFamilyMember,
  useDeleteFamilyMember,
  useFamilyMembers,
  useUpdateFamilyMember,
} from "@/hooks/use-family";
import type { ApiFamilyMember, FamilyMemberPayload } from "@/lib/api/family";

type EditorMode = { type: "add" } | { type: "edit"; id: number };

const RELATIONS: FamilyMemberPayload["relation"][] = ["spouse", "child", "parent", "sibling", "other"];
const AUDIENCES: FamilyMemberPayload["audience"][] = ["men", "women", "unisex"];

function emptyForm(): FamilyMemberPayload {
  return { name: "", relation: "other", audience: "unisex", phone: "" };
}

function memberToForm(member: ApiFamilyMember): FamilyMemberPayload {
  return {
    name: member.name,
    relation: member.relation,
    audience: member.audience,
    phone: member.phone || "",
  };
}

function FamilyMemberForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: FamilyMemberPayload;
  saving: boolean;
  onSave: (values: FamilyMemberPayload) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [values, setValues] = useState(initial);

  return (
    <ProfileSubpageCard className="space-y-3">
      <input
        type="text"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        placeholder={t("family.form.name", { defaultValue: "Ism" })}
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
      />
      <select
        value={values.relation}
        onChange={(e) =>
          setValues((v) => ({ ...v, relation: e.target.value as FamilyMemberPayload["relation"] }))
        }
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
      >
        {RELATIONS.map((rel) => (
          <option key={rel} value={rel}>
            {t(`family.relations.${rel}`, { defaultValue: rel })}
          </option>
        ))}
      </select>
      <select
        value={values.audience}
        onChange={(e) =>
          setValues((v) => ({ ...v, audience: e.target.value as FamilyMemberPayload["audience"] }))
        }
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
      >
        {AUDIENCES.map((aud) => (
          <option key={aud} value={aud}>
            {t(`family.audiences.${aud}`, { defaultValue: aud })}
          </option>
        ))}
      </select>
      <input
        type="tel"
        value={values.phone || ""}
        onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
        placeholder={t("family.form.phoneOptional", { defaultValue: "Telefon (ixtiyoriy)" })}
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm font-medium outline-none focus:border-foreground"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={saving || !values.name.trim()}
          onClick={() => onSave({ ...values, name: values.name.trim(), phone: (values.phone || "").trim() })}
          className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-bold text-background disabled:opacity-50"
        >
          {t("common.save", { defaultValue: "Saqlash" })}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold"
        >
          {t("common.cancel", { defaultValue: "Bekor" })}
        </button>
      </div>
    </ProfileSubpageCard>
  );
}

export function SettingsFamilyPanel({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const { data: members = [], isLoading } = useFamilyMembers();
  const createMember = useCreateFamilyMember();
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();
  const [editor, setEditor] = useState<EditorMode | null>(null);

  const editorInitial = useMemo(() => {
    if (!editor) return undefined;
    if (editor.type === "add") return emptyForm();
    const member = members.find((m) => m.id === editor.id);
    return member ? memberToForm(member) : emptyForm();
  }, [editor, members]);

  const busy = createMember.isPending || updateMember.isPending || deleteMember.isPending;

  const handleSave = (values: FamilyMemberPayload) => {
    if (editor?.type === "edit") {
      updateMember.mutate(
        { id: editor.id, data: values },
        {
          onSuccess: () => {
            toast.success(t("settings.saved", { defaultValue: "Saqlandi" }));
            setEditor(null);
          },
          onError: (e: Error) => toast.error(e.message),
        },
      );
      return;
    }
    createMember.mutate(values, {
      onSuccess: () => {
        toast.success(t("settings.saved", { defaultValue: "Saqlandi" }));
        setEditor(null);
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  const handleDelete = (id: number) => {
    deleteMember.mutate(id, {
      onSuccess: () => toast.success(t("family.deleted", { defaultValue: "O'chirildi" })),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className={embedded ? "mt-4" : undefined}>
      {embedded ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {t("family.subtitle", { defaultValue: "Oila a'zolari uchun tez bron qilish." })}
        </p>
      ) : null}

      {editor && editorInitial ? (
        <FamilyMemberForm
          initial={editorInitial}
          saving={busy}
          onSave={handleSave}
          onCancel={() => setEditor(null)}
        />
      ) : null}

      {isLoading ? (
        <ProfileSubpageCard>
          <p className="text-sm text-muted-foreground">{t("common.loading", { defaultValue: "Yuklanmoqda…" })}</p>
        </ProfileSubpageCard>
      ) : members.length === 0 && !editor ? (
        <EmptyState
          icon={<UserRound className="h-7 w-7" />}
          title={t("family.empty", { defaultValue: "Oilaviy a'zolar yo'q" })}
          description={t("family.emptyHint", {
            defaultValue: "Oila a'zolarini qo'shing — ular uchun tezroq bron qiling.",
          })}
        />
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <ProfileSubpageCard key={member.id}>
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{member.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {member.relation_label} · {member.audience_label}
                  </p>
                  {member.phone ? <p className="mt-1 text-xs font-medium">{member.phone}</p> : null}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditor({ type: "edit", id: member.id })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("settings.actions.edit", { defaultValue: "Tahrirlash" })}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(member.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("common.delete", { defaultValue: "O'chirish" })}
                </button>
              </div>
            </ProfileSubpageCard>
          ))}
        </div>
      )}

      {!editor ? (
        <ProfileSubpageCard className="mt-4">
          <button
            type="button"
            disabled={busy || members.length >= 10}
            onClick={() => setEditor({ type: "add" })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-bold disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t("family.addMember", { defaultValue: "A'zo qo'shish" })}
          </button>
        </ProfileSubpageCard>
      ) : null}
    </div>
  );
}
