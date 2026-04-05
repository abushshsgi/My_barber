import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AdminBarbers from "@/page-views/admin/AdminBarbers";

export default function AdminBarbersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <AdminBarbers />
    </Suspense>
  );
}
