"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { mediaSrc, PLACEHOLDER_AVATAR } from "@/lib/media";
import { MapPin, Scissors } from "lucide-react";
import type { BarberListApi } from "@/lib/barber-queries";

function avatarSrc(path: string | null): string {
  return mediaSrc(path, PLACEHOLDER_AVATAR);
}

export function BarberCard({ barber }: { barber: BarberListApi }) {
  return (
    <Card className="p-4 rounded-2xl border border-border/50">
      <div className="flex items-start gap-3">
        <img
          src={avatarSrc(barber.avatar)}
          alt={barber.name}
          className="w-12 h-12 rounded-2xl object-cover border border-border/50"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{barber.name || "Barber"}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{barber.location_text || "—"}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1">
            {barber.active_services?.length
              ? barber.active_services.map((s) => s.name).join(", ")
              : "Xizmatlar kiritilmagan"}
          </p>
        </div>
        <Button asChild size="sm" className="rounded-xl gold-gradient text-gold-foreground border-0">
          <Link href={`/booking/barber/${barber.barber_id}`}>
            <Scissors className="h-4 w-4 mr-1" /> Book
          </Link>
        </Button>
      </div>
    </Card>
  );
}

