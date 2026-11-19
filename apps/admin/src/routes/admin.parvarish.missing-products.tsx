import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ScanLine, Users, AlertTriangle, Package } from "lucide-react";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { apiJson } from "@/lib/api";

type MissingDashboard = {
  kpis: Record<string, number | null>;
  products: {
    total: number;
    page: number;
    results: Array<{
      barcode: string;
      brand: string;
      product_name: string;
      scan_count: number;
      unique_users: number;
      submission_count: number;
      review_priority: number;
      verification_status: string;
      candidate_id: string | null;
      formula_conflicts: boolean;
      last_scanned: string | null;
    }>;
  };
};

async function fetchMissing(params: {
  q?: string;
  sort?: string;
  status?: string;
  page?: number;
}): Promise<MissingDashboard> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.sort) sp.set("sort", params.sort);
  if (params.status) sp.set("status", params.status);
  if (params.page) sp.set("page", String(params.page));
  const q = sp.toString();
  return apiJson(`/api/v1/admin/missing-products/${q ? `?${q}` : ""}`);
}

export const Route = createFileRoute("/admin/parvarish/missing-products")({
  component: MissingProductsPage,
});

function MissingProductsPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("most_scans");
  const [status, setStatus] = useState("");
  const params = useMemo(() => ({ q: search, sort, status, page: 1 }), [search, sort, status]);
  const q = useQuery({
    queryKey: ["admin", "missing-products", params],
    queryFn: () => fetchMissing(params),
  });
  if (q.isLoading) return <CardSkeleton className="h-64" />;
  const data = q.data;
  if (!data) return <p className="text-sm text-muted-foreground">Ma'lumot yuklanmadi.</p>;

  const k = data.kpis;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Bazamizda yo&apos;q mahsulotlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">So&apos;ralgan, lekin tasdiqlanmagan mahsulotlar</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Noma'lum skan" value={Number(k.unknown_barcode_scans ?? 0)} icon={ScanLine} />
        <KPICard label="Topshiruvlar" value={Number(k.product_submissions ?? 0)} icon={Package} />
        <KPICard label="Hissa qiluvchilar" value={Number(k.unique_contributors ?? 0)} icon={Users} />
        <KPICard label="INCI konflikt" value={Number(k.ingredient_conflicts ?? 0)} icon={AlertTriangle} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="rounded-lg border border-border px-3 py-2 text-sm"
          placeholder="Qidiruv (brand, barcode...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="rounded-lg border border-border px-2 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="most_scans">Ko&apos;p skan</option>
          <option value="most_users">Ko&apos;p foydalanuvchi</option>
          <option value="highest_priority">Ustuvorlik</option>
          <option value="most_recent">So&apos;nggi</option>
        </select>
        <select className="rounded-lg border border-border px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Barcha holat</option>
          <option value="open">open</option>
          <option value="conflict">conflict</option>
          <option value="no_candidate">no_candidate</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3">Mahsulot</th>
              <th className="p-3">Barcode</th>
              <th className="p-3">Skan</th>
              <th className="p-3">Foydalanuvchi</th>
              <th className="p-3">Ustuvorlik</th>
              <th className="p-3">Holat</th>
            </tr>
          </thead>
          <tbody>
            {data.products.results.map((row) => (
              <tr key={row.barcode} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  {row.brand} {row.product_name || "—"}
                </td>
                <td className="p-3 font-mono text-xs">{row.barcode}</td>
                <td className="p-3">{row.scan_count}</td>
                <td className="p-3">{row.unique_users}</td>
                <td className="p-3">{row.review_priority}</td>
                <td className="p-3">
                  <Badge variant={row.formula_conflicts ? "destructive" : "secondary"}>
                    {row.verification_status}
                  </Badge>
                  {row.candidate_id ? (
                    <Link
                      to="/admin/parvarish/verification"
                      className="ml-2 text-xs text-primary hover:underline"
                    >
                      Tekshiruv
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}