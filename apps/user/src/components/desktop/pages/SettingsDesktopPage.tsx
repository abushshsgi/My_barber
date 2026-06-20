import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { DESKTOP_ACCOUNT_BG } from "@/components/desktop/ui/desktop-glass";
import { SettingsAirbnbSidebar } from "@/components/settings/SettingsAirbnbSidebar";
import { SettingsPanelContent } from "@/components/settings/SettingsPanelContent";
import type { SettingsPageState } from "@/components/settings/useSettingsPage";
import type { SettingsSection } from "@/lib/settings-nav";
import { cn } from "@/lib/utils";

type Props = {
  state: SettingsPageState;
  section: SettingsSection;
};

export function SettingsDesktopPage({ state, section }: Props) {
  const { t } = state;

  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 lg:px-0", DESKTOP_ACCOUNT_BG)}>
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-border/70 pb-4">
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          {t("profile.desktop.pageTitle", { defaultValue: "Mening hisobim" })}
        </Link>
        <Link
          to="/profile"
          className="text-sm font-semibold text-foreground underline underline-offset-2 hover:opacity-80"
        >
          {t("settings.done", { defaultValue: "Tayyor" })}
        </Link>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-16 lg:pb-12">
        <aside className="lg:w-[280px] lg:shrink-0">
          <h1 className="text-[32px] font-semibold tracking-tight text-foreground">
            {t("settings.pageTitle", { defaultValue: "Hisob sozlamalari" })}
          </h1>
          <div className="mt-6">
            <SettingsAirbnbSidebar active={section} t={t} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:max-w-[720px] lg:pt-1">
          <SettingsPanelContent section={section} state={state} />
        </main>
      </div>
    </div>
  );
}
