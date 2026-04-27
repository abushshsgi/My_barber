import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/profile")({ component: ProfilePage });

function ProfilePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
          Profil
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Sizning admin hisobingiz.</p>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-card p-6 flex items-center gap-5">
        <img
          src="https://i.pravatar.cc/150?img=12"
          className="size-20 rounded-full ring-1 ring-border"
          alt=""
        />
        <div>
          <div className="font-heading text-xl font-semibold text-foreground">Admin Karimov</div>
          <div className="text-sm text-muted-foreground">admin@shearhq.uz</div>
          <div className="text-xs text-muted-foreground mt-1">Bosh administrator</div>
        </div>
      </div>
      <div className="bg-card rounded-2xl border border-border shadow-card p-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Telefon</span>
          <span className="text-foreground">+998 90 123 45 67</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Til</span>
          <span className="text-foreground">O'zbekcha</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">2FA</span>
          <span className="text-foreground">Yoqilgan</span>
        </div>
      </div>
    </div>
  );
}
