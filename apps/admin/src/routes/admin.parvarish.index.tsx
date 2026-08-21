import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FlaskConical, Package, ScanLine, Sparkles } from "lucide-react";
import { fetchAdminParvarishStats } from "@/lib/admin-api";
import { KPICard } from "@/components/admin/KPICard";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { EmptyState } from "@/components/admin/EmptyState";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/parvarish/")({
  component: ParvarishIndexPage,
});

const VERDICT_LABEL: Record<string, string> = {
  good: "Yaxshi",
  caution: "Ehtiyot",
  bad: "Yomon",
  dangerous: "Xavfli",
};

function ParvarishIndexPage() {
  const stats = useQuery({
    queryKey: ["admin", "parvarish", "stats"],
    queryFn: fetchAdminParvarishStats,
  });

  if (stats.isLoading) {
    return <CardSkeleton className="h-48" />;
  }

  const data = stats.data;
  if (!data) {
    return <EmptyState title="Statistika yuklanmadi" description="Qayta urinib ko'ring." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Parvarish</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Soch mahsulotlari katalogi va user tarkib skanlari
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Mahsulotlar" value={data.products_total} icon={Package} />
        <KPICard label="Nashr qilingan" value={data.products_published} icon={Sparkles} />
        <KPICard label="Skanlar" value={data.scans_total} icon={ScanLine} />
        <KPICard label="Bugun" value={data.scans_today} icon={FlaskConical} />
      </div>

      <div className="flex justify-end">
        <Link
          to="/admin/parvarish/tarkib"
          className="text-sm font-medium text-primary hover:underline"
        >
          Tarkib katalogiga o'tish
        </Link>
      </div>

      {data.recent_scans.length === 0 ? (
        <EmptyState title="Skanlar yo'q" description="Userlar mahsulot tarkibini skan qilganda shu yerda ko'rinadi." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mahsulot</TableHead>
                <TableHead>Natija</TableHead>
                <TableHead className="text-right">Ball</TableHead>
                <TableHead>Vaqt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recent_scans.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.product_name || row.extracted_name || "Noma'lum"}</div>
                    <div className="text-xs text-muted-foreground">user #{row.user_id}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.verdict === "good" ? "default" : "secondary"}>
                      {VERDICT_LABEL[row.verdict] || row.verdict}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.safety_score}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString("uz-UZ") : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
