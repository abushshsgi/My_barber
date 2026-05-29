import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";

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
    <div className="pb-8">
      <PageHeader showBack title="Maxfiylik" />
      <div className="px-5 space-y-6">
        <section>
          <h2 className="text-base font-bold tracking-tight">Ma'lumotlaringiz</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            mysaloon.uz sizning shaxsiy ma'lumotlaringizni faqat platformadan
            foydalanish va xizmat ko'rsatish uchun ishlatadi. Uchinchi shaxslarga
            sotmaymiz.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold tracking-tight">Lokatsiya</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Lokatsiya faqat yaqin atrofdagi salonlarni ko'rsatish uchun
            so'raladi. Saqlanmaydi.
          </p>
        </section>
        <section>
          <h2 className="text-base font-bold tracking-tight">Xavfsizlik</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Barcha aloqalar shifrlangan. Telefon raqamingiz SMS orqali
            tasdiqlanadi.
          </p>
        </section>

        <p className="pt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Oxirgi yangilanish: 2026-05-28
        </p>
      </div>
    </div>
  );
}
