import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import {
  HOME_GI_LAYOUT_COMPONENTS,
  HOME_GI_LAYOUTS,
  parseHomeGiLayout,
  type HomeGiLayoutId,
} from "@/lib/home-gi-layouts";
import { useHomeData } from "@/components/home/useHomeData";
import { HomeGiLayoutPicker } from "@/components/desktop/home/HomeGiLayoutPicker";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home/layout-variants")({
  validateSearch: (search: Record<string, unknown>) => ({
    gi: parseHomeGiLayout(search.gi ?? "1"),
  }),
  head: () => ({ meta: [{ title: "Home GI layoutlari — mysaloon.uz" }] }),
  component: HomeLayoutVariantsPage,
});

function HomeLayoutVariantsPage() {
  const data = useHomeData();
  const { gi } = useSearch({ from: "/home/layout-variants" });

  return (
    <DesktopPageSplit
      mobile={
        <div className="space-y-4 px-4 py-6 pb-28">
          <p className="text-sm text-muted-foreground">
            Quyidan 1–10 layoutni tanlang. Tanlangan variant bosh sahifada ham shu ko‘rinishda ochiladi.
          </p>
          <HomeGiLayoutPicker active={gi} variant="inline" linkTo="/home/layout-variants" />
          <Link to="/" search={{ gi }} className="inline-block text-sm font-bold text-foreground underline">
            Bosh sahifada ko‘rish →
          </Link>
        </div>
      }
      desktop={<HomeLayoutVariantsDesktop data={data} active={gi} />}
    />
  );
}

function HomeLayoutVariantsDesktop({
  data,
  active,
}: {
  data: ReturnType<typeof useHomeData>;
  active: HomeGiLayoutId;
}) {
  const ActiveLayout = HOME_GI_LAYOUT_COMPONENTS[active];
  const activeMeta = HOME_GI_LAYOUTS.find((l) => l.id === active)!;

  return (
    <div className={cn("flex w-full flex-col gap-8 pb-28", DESKTOP_BAZAAR_INSET)}>
      <header className="sticky top-[4.5rem] z-40 space-y-4 rounded-2xl border border-border bg-background/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Home · GI layout tanlash
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight xl:text-2xl">10 ta layout — birini tanlang</h1>
          </div>
          <Link
            to="/"
            search={{ gi: active }}
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background"
          >
            Tanlanganini bosh sahifada ochish →
          </Link>
        </div>
        <HomeGiLayoutPicker active={active} variant="inline" linkTo="/home/layout-variants" />
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{activeMeta.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{activeMeta.subtitle}</p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm ring-1 ring-border/40">
          <div className="max-h-[min(85vh,900px)] overflow-y-auto overflow-x-clip p-4 xl:p-6">
            <ActiveLayout data={data} />
          </div>
        </div>
      </section>

      <div className="space-y-6 border-t border-border pt-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Barcha variantlar</h3>
        {HOME_GI_LAYOUTS.filter((m) => m.id !== active).map((meta) => {
          const Layout = HOME_GI_LAYOUT_COMPONENTS[meta.id];
          return (
            <section key={meta.id} id={`gi-${meta.id}`} className="scroll-mt-32 space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold tracking-tight">{meta.title}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">{meta.subtitle}</p>
                </div>
                <Link
                  to="/home/layout-variants"
                  search={{ gi: meta.id }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-surface"
                >
                  Tanlash
                </Link>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-background/50">
                <div className="max-h-[420px] overflow-y-auto overflow-x-clip p-3 opacity-90">
                  <Layout data={data} />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
