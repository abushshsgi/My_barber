import { BarberLayout } from "@/components/BarberLayout";

export default function BarberDashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BarberLayout>{children}</BarberLayout>;
}
