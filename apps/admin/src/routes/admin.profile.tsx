import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminProfile } from "@/lib/admin-api";
import { CardSkeleton } from "@/components/admin/Skeletons";

export const Route = createFileRoute("/admin/profile")({ component: ProfilePage });

function ProfilePage() {
  const profileQ = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: fetchAdminProfile,
  });
  const profile = profileQ.data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Profil
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Sizning admin hisobingiz.</p>
      </div>
      {profileQ.isLoading ? (
        <CardSkeleton className="h-56" />
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 flex items-center gap-5">
            <img
              src="https://i.pravatar.cc/150?img=12"
              className="size-20 rounded-full ring-1 ring-border"
              alt=""
            />
            <div>
              <div className="font-heading text-xl font-semibold text-foreground">
                {profile?.email?.split("@")[0] || "Admin"}
              </div>
              <div className="text-sm text-muted-foreground">{profile?.email || "—"}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {profile?.role || "Bosh administrator"}
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-card p-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{profile?.email || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="text-foreground">{profile?.role || "—"}</span>
            </div>
          </div>
        </>
      )}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Token holati</span>
          <span className="text-foreground">Faol</span>
        </div>
      </div>
    </div>
  );
}
