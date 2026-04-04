import { redirect } from "next/navigation";

/** Eski /admin/data — mijozlar sahifasiga yo'naltiriladi. */
export default function AdminDataRedirectPage() {
  redirect("/admin/users");
}
