import { ProfileSubpageCard } from "@/components/profile/ProfileSubpageLayout";

export function SettingsPrivacyPanel({ embedded = false }: { embedded?: boolean }) {
  return (
    <div className={embedded ? "mt-4 space-y-4" : "space-y-4"}>
      <ProfileSubpageCard>
        <h3 className="text-base font-bold tracking-tight">Ma'lumotlaringiz</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          mysaloon.uz sizning shaxsiy ma'lumotlaringizni faqat platformadan foydalanish va xizmat
          ko'rsatish uchun ishlatadi. Uchinchi shaxslarga sotmaymiz.
        </p>
      </ProfileSubpageCard>
      <ProfileSubpageCard>
        <h3 className="text-base font-bold tracking-tight">Lokatsiya</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Lokatsiya faqat yaqin atrofdagi salonlarni ko'rsatish uchun so'raladi. Saqlanmaydi.
        </p>
      </ProfileSubpageCard>
      <ProfileSubpageCard>
        <h3 className="text-base font-bold tracking-tight">Xavfsizlik</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Barcha aloqalar shifrlangan. Telefon raqamingiz SMS orqali tasdiqlanadi.
        </p>
      </ProfileSubpageCard>
    </div>
  );
}
