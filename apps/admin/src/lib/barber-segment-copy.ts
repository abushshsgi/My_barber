import type { AdminBarberAccountSegment } from "@/lib/admin-api";

/** Admin ro‘yxatidagi segment bilan bir xil qisqa nom (backend `segment_label` ga mos). */
export function getBarberSegmentTitle(segment: AdminBarberAccountSegment): string {
  const titles: Record<AdminBarberAccountSegment, string> = {
    independent: "Mustaqil barber",
    mybarber_salon: "MyBarber (salon)",
    salon_owner: "Salon egasi",
    salon_employee: "Salonga qo‘shilgan",
    unknown: "Aniqlanmagan / eski",
  };
  return titles[segment] ?? segment;
}

/** Detail / taqsimot kartalarida ishlatiladigan qisqa izoh. */
export function getBarberSegmentDescription(segment: AdminBarberAccountSegment): string {
  const d: Record<AdminBarberAccountSegment, string> = {
    independent:
      "U mustaqil sifatida ishlaydi: o‘z mijozlari va mustaqil bronlar rejimi. Boshqa salon egasi yoki ishchi sifatida tizimda ajratilmagan.",
    mybarber_salon:
      "Salon MyBarber oqimi orqali yaratilgan yoki shu yo‘l bilan ro‘yxatdan o‘tgan. Mustaqil barber sifatida belgilanmagan.",
    salon_owner:
      "Kamida bitta salonning egasi. MyBarber salon oqimi yoki mustaqil barber segmentiga kirmaydi (ular yuqori ustuvorlikda alohida).",
    salon_employee:
      "Boshqa egaga tegishli salonda faol a’zolik bor; o‘z saloniga ega emas yoki segment boshqa yo‘l bilan aniqlangan.",
    unknown:
      "Hozirgi ma’lumotlar bo‘yicha aniq kategoriyaga kirmaydi (masalan, eski akkaunt yoki hali salon/mustaqil bog‘lanmagan).",
  };
  return d[segment] ?? d.unknown;
}
