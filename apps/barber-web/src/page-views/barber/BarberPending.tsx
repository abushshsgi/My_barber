"use client";

import Link from "next/link";
import { Button } from '@/components/ui/button';

const BarberPending = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-center">
      <div className="w-20 h-20 rounded-full border-4 border-accent/30 border-t-accent animate-spin mb-8" />
      <h1 className="text-2xl font-bold mb-2">Kutilmoqda...</h1>
      <p className="text-muted-foreground max-w-xs mb-8">
        Sizning arizangiz ko&apos;rib chiqilmoqda. Admin tasdiqlashini kutmoqdasiz.
      </p>
      <Link href="/barber/auth">
        <Button variant="outline" className="rounded-xl">Orqaga</Button>
      </Link>
    </div>
  );
};

export default BarberPending;
