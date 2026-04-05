import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AdminSalons from "@/page-views/admin/AdminSalons";

export default function AdminSalonsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <AdminSalons />
    </Suspense>
  );
}
