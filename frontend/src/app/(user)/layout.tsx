import { UserLayout } from "@/components/UserLayout";

export default function UserAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserLayout>{children}</UserLayout>;
}
