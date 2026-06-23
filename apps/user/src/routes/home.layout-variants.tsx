import { createFileRoute, Link } from "@tanstack/react-router";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import {
  HOME_GI_LAYOUT_COMPONENTS,
  HOME_GI_LAYOUTS,
} from "@/lib/home-gi-layouts";
import { useHomeData } from "@/components/home/useHomeData";
import { HomeGiLayoutPreviewStrip } from "@/components/desktop/home/HomeDesktopRoot";
import { DESKTOP_BAZAAR_INSET } from "@/lib/desktop-bazaar-layout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/home/layout-variants")({
  head: () => ({ meta: [{ title: "Home GI layoutlari — mysaloon.uz" }] }),
  component: HomeLayoutVariantsPage,
});

function HomeLayoutVariantsPage() {
  const data = useHomeData();

  return (
    <DesktopPageSplit
      mobile={
        <div className="px-4 py-6">
          <p className="text-sm text-muted-foreground">
            GI layoutlar faqat desktop uchun. Katta ekranda oching yoki{" "}
            <Link to="/" search={{ gi: "1" }} className="font-semibold text-foreground underline">
              bosh sahifaga
            </Link>{" "}
            o‘ting.
          </p>
          <HomeGiLayoutPreviewStrip className="mt-4" />
        </div>
      }
      desktop={<HomeLayoutVariantsDesktop data={data} />}
    />
  );
}

function HomeLayoutVariantsDesktop({ data }: { data: ReturnType<typeof useHomeData> }) {
  return (
    <div className={cn("flex w-full flex-col gap-10 pb-24", DESKTOP_BAZAAR_INSET)}>
      <header className="space-y-3 border-b border-border pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Home · GI layout tanlash
        </p>
        <h1 className="text-2xl font-bold tracking-tight xl:text-3xl">10 ta bosh sahifa layouti</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Har bir variantni ko‘rib chiqing. Yoqqanini to‘liq ekranda ochish uchun{" "}
          <span className="font-semibold text-foreground">To‘liq ko‘rish</span> tugmasini bosing yoki
          bosh sahifada <code className="rounded bg-surface px-1.5 py-0.5">?gi=1</code> …{" "}
          <code className="rounded bg-surface px-1.5 py-0.5">?gi=10</code> ishlating.
        </p>
        <HomeGiLayoutPreviewStrip />
      </header>

      {HOME_GI_LAYOUTS.map((meta) => {
        const Layout = HOME_GI_LAYOUT_COMPONENTS[meta.id];
        return (
          <section key={meta.id} id={`gi-${meta.id}`} className="scroll-mt-24 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight">{meta.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{meta.subtitle}</p>
              </div>
              <Link
                to="/"
                search={{ gi: meta.id }}
                className="rounded-xl bg-foreground px-4 py-2 text-sm font-bold text-background"
              >
                To‘liq ko‘rish →
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm ring-1 ring-border/40">
              <div className="max-h-[min(85vh,900px)] overflow-y-auto overflow-x-clip p-4 xl:p-6">
                <Layout data={data} />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
