"use client";

import { HelpCircle, Mail, MessageSquare } from "lucide-react";
import { PageHeader, SectionCard } from "@/adminhub-ui/barber/primitives";

export default function HelpPage() {
  return (
    <div className="page-container space-y-6">
      <PageHeader title="Yordam" description="Savollar va support." />

      <SectionCard title="Tez-tez so‘raladigan savollar">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <div className="font-medium text-foreground">Bronni qanday boshlayman?</div>
            <div>Bookings sahifasida “Start” tugmasini bosing.</div>
          </div>
          <div>
            <div className="font-medium text-foreground">Bildirishnomalar qayerdan keladi?</div>
            <div>Backend’dan `notifications` endpoint va websocket orqali.</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Support bilan bog‘lanish">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-4 flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Chat</div>
              <div className="text-sm text-muted-foreground">Tezkor savollar uchun.</div>
            </div>
          </div>
          <div className="rounded-xl border border-border p-4 flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="font-medium">Email</div>
              <div className="text-sm text-muted-foreground">support@mybarber.uz</div>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground inline-flex items-center gap-2">
          <HelpCircle className="h-3.5 w-3.5" /> Bu sahifa statik. Ticketing API qo‘shilsa, real support flow qilamiz.
        </div>
      </SectionCard>
    </div>
  );
}

