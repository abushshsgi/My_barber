"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md p-6 space-y-3">
        <h1 className="text-xl font-semibold">Salonga qo‘shilish</h1>
        <p className="text-sm text-muted-foreground">
          Bu sahifa hali ulanmagan. Agar siz salon egasidan taklif (invite) olgan bo‘lsangiz,
          keyingi bosqichda shu yerga invite code / link qo‘shamiz.
        </p>
        <div className="flex gap-2 pt-2">
          <Button asChild className="rounded-xl">
            <Link href="/">Dashboard</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/salon-view">Salon View</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

