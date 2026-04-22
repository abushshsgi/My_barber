"use client";

import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Star,
  User,
  Bell,
  Building2,
  ArrowLeftRight,
} from "lucide-react";
import { NavLink } from "@/panel/components/NavLink";
import { useApp } from "@/panel/contexts/AppContext";
import { useBarberOnboardingStatus } from "@/hooks/useBarberOnboardingStatus";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const independentItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Bookings", url: "/bookings", icon: Calendar },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Chat", url: "/chat", icon: MessageSquare },
  { title: "Reviews", url: "/reviews", icon: Star },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Notifications", url: "/notifications", icon: Bell },
];

const salonItems = [
  { title: "Overview", url: "/salon-view", icon: Building2 },
  { title: "Gallery", url: "/salon-view/gallery", icon: LayoutDashboard },
  { title: "Reviews", url: "/salon-view/reviews", icon: Star },
];

const onboardingItems = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { viewMode, setViewMode, salons } = useApp();
  const { data: onboarding, isLoading } = useBarberOnboardingStatus(true);
  const isComplete = Boolean(onboarding?.is_complete);
  const items =
    !isLoading && !isComplete
      ? onboardingItems
      : viewMode === "independent"
        ? independentItems
        : salonItems;
  const hasSalons = salons.length > 0;

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent className="pt-4">
        {!collapsed && (
          <div className="px-4 pb-4">
            <h1 className="text-xl font-bold tracking-tight text-foreground">MyBarber</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {viewMode === "independent" ? "Independent Panel" : "Salon View"}
            </p>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center pb-4">
            <span className="text-lg font-bold text-foreground">M</span>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      href={item.url}
                      end={item.url === "/" || item.url === "/salon-view"}
                      className="hover:bg-accent/50 transition-colors"
                      activeClassName="bg-accent text-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {hasSalons && isComplete && (
        <SidebarFooter className="p-3">
          {!collapsed && <Separator className="mb-3" />}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "independent" ? "salon" : "independent")}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity justify-center"
          >
            <ArrowLeftRight className="h-4 w-4" />
            {!collapsed && (
              <span>{viewMode === "independent" ? "Salon View" : "Independent View"}</span>
            )}
          </button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
