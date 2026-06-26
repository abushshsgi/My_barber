import { describe, expect, it } from "vitest";
import type { Service } from "@/lib/mock-data";
import {
  filterSalonOwnerServices,
  filterSalonServicesForBarber,
  resolveDefaultSalonBarberId,
} from "@/lib/salon-services";

const services: Service[] = [
  { id: "1", name: "Owner cut", duration: 30, price: 50000, barberId: "10" },
  { id: "2", name: "Worker cut", duration: 30, price: 40000, barberId: "20" },
  { id: "3", name: "Legacy shared", duration: 20, price: 30000, barberId: null },
];

describe("salon-services", () => {
  it("filterSalonOwnerServices keeps owner and legacy shared", () => {
    const out = filterSalonOwnerServices(services, "10");
    expect(out.map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("filterSalonServicesForBarber scopes to barber", () => {
    const out = filterSalonServicesForBarber(services, "20");
    expect(out.map((s) => s.id)).toEqual(["2", "3"]);
  });

  it("resolveDefaultSalonBarberId prefers owner", () => {
    const id = resolveDefaultSalonBarberId([
      { id: "10", role: "Salon egasi", isBookable: false },
      { id: "20", role: "Usta", isBookable: true },
    ]);
    expect(id).toBe("10");
  });
});
