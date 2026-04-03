"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Users, Scissors, Store, TrendingUp, Clock, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { fetchAdminStats } from "@/lib/admin-api";

const AdminDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-6 text-center text-destructive">
        <AlertCircle className="h-10 w-10 mx-auto mb-2" />
        {(error as Error).message}
      </div>
    );
  }

  const stats = [
    {
      label: "Jami foydalanuvchilar",
      value: String(data.users_total),
      sub: `${data.users_clients} mijoz`,
      icon: Users,
      color: "bg-blue-500/15 text-blue-400",
    },
    {
      label: "Sartaroshlar",
      value: String(data.barbers_total),
      sub: "owner + staff",
      icon: Scissors,
      color: "bg-accent/15 text-accent",
    },
    {
      label: "Faol salonlar",
      value: String(data.salons_published),
      sub: `${data.salons_pending_review} kutilmoqda`,
      icon: Store,
      color: "bg-emerald-500/15 text-emerald-400",
    },
    {
      label: "Bugungi bandlar",
      value: String(data.bookings_today),
      sub: `jami ${data.bookings_total}`,
      icon: TrendingUp,
      color: "bg-purple-500/15 text-purple-400",
    },
    {
      label: "Kutilayotgan arizalar",
      value: String(data.barber_applications_pending),
      sub: "sartarosh ro'yxati",
      icon: Clock,
      color: "bg-amber-500/15 text-amber-400",
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold mb-1">Admin panel</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Ma&apos;lumotlar to&apos;liq API orqali (Django admin emas)
        </p>

        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="p-4 h-full">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">{stat.sub}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
