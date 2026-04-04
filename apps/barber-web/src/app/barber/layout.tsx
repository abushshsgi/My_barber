import { BarberAuthGuard } from "@/components/BarberAuthGuard";

export default function BarberRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BarberAuthGuard>{children}</BarberAuthGuard>;
}
