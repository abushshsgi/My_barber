"use client";
import { useApp } from "@/panel/contexts/AppContext";
import { EmptyState } from "@/panel/components/EmptyState";
import { Users } from "lucide-react";

export default function Clients() {
  const { bookings } = useApp();
  const completed = bookings.filter((b) => b.status === "completed");

  const clientMap = new Map<string, { visits: number; lastVisit: string }>();
  completed.forEach((b) => {
    const existing = clientMap.get(b.clientName);
    if (existing) {
      existing.visits += 1;
    } else {
      clientMap.set(b.clientName, { visits: 1, lastVisit: b.date });
    }
  });

  const clients = Array.from(clientMap.entries()).map(([name, data]) => ({ name, ...data }));

  if (clients.length === 0) {
    return (
      <div className="page-container">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Clients</h1>
        <p className="text-muted-foreground text-sm mb-6">Your client list</p>
        <EmptyState icon={Users} title="No clients yet" description="Clients will appear after completing bookings." />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground text-sm mt-1">{clients.length} clients</p>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Visits</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-semibold">{client.name.charAt(0)}</span>
                    </div>
                    <span className="text-sm font-medium">{client.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{client.visits}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{client.lastVisit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
