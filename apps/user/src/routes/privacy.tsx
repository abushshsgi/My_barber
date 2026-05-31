import { createFileRoute } from "@tanstack/react-router";
import { ProfileSubpageCard, ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Maxfiylik — mysaloon.uz" },
      { name: "description", content: "mysaloon.uz maxfiylik siyosati." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <ProfileSubpageLayout title="Maxfiylik">
      <div className="space-y-4">
        <ProfileSubpageCard>
          <h2 className="text-base font-bold tracking-tight">Ma'lumotlaringiz</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            mysaloon.uz sizning shaxsiy ma'lumotlaringizni faqat platformadan foydalanish va
            xizmat ko'rsatish uchun ishlatadi. Uchinchi shaxslarga sotmaymiz.
          </p>
        </ProfileSubpageCard>
        <ProfileSubpageCard>
          <h2 className="text-base font-bold tracking-tight">Lokatsiya</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Lokatsiya faqat yaqin atrofdagi salonlarni ko'rsatish uchun so'raladi. Saqlanmaydi.
          </p>
        </ProfileSubpageCard>
        <ProfileSubpageCard>
          <h2 className="text-base font-bold tracking-tight">Xavfsizlik</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Barcha aloqalar shifrlangan. Telefon raqamingiz SMS orqali tasdiqlanadi.
          </p>
        </ProfileSubpageCard>
      </div>
    </ProfileSubpageLayout>
  );
}
