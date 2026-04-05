import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import CreateSalon from "@/page-views/barber/CreateSalon";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CreateSalon />
    </Suspense>
  );
}

