import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/admin/EmptyState";
import { CardSkeleton } from "@/components/admin/Skeletons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminHairCareProfiles } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/parvarish/profiles")({
  component: HairProfilesPage,
});

const LABEL: Record<string, string> = {
  oily: "Yog‘li",
  dry: "Quruq",
  normal: "Oddiy",
  damaged: "Shikastlangan",
  straight: "Tekis",
  wavy: "To‘lqinli",
  curly: "Jingalak",
  natural: "Tabiiy",
  colored: "Bo‘yalgan",
  bleached: "Oqartirilgan",
  sensitive: "Sezgir",
};

function label(value: string) {
  if (!value) return "—";
  return LABEL[value] || value;
}

function HairProfilesPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const profiles = useQuery({
    queryKey: ["admin", "parvarish", "hair-profiles", debounced],
    queryFn: () => fetchAdminHairCareProfiles({ q: debounced || undefined }),
  });

  if (profiles.isLoading) return <CardSkeleton className="h-64" />;
  if (!profiles.data) {
    return <EmptyState title="Yuklanmadi" description="Soch tahlillarini olishda xato." />;
  }

  const data = profiles.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">Soch tahlili</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Foydalanuvchi saqlagan soch holati, tekstura va rang. Parvarish, ob-havo va chatbot shunga tayanadi.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{data.complete} tayyor</Badge>
          <Badge variant="outline">{data.total} profil</Badge>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ism, telefon yoki holat..."
          className="pl-9"
        />
      </div>

      {data.profiles.length === 0 ? (
        <EmptyState
          title="Hali tahlil yo‘q"
          description="Foydalanuvchi soch tahlilini saqlaganda shu yerda ko‘rinadi."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foydalanuvchi</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Tekstura</TableHead>
                <TableHead>Rang</TableHead>
                <TableHead>Bosh terisi</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.profiles.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      to="/admin/users/$userId"
                      params={{ userId: String(row.user_id) }}
                      className="font-medium hover:underline"
                    >
                      {row.full_name || row.username || row.phone || `#${row.user_id}`}
                    </Link>
                    <p className="text-xs text-muted-foreground">{row.phone || "—"}</p>
                  </TableCell>
                  <TableCell>{label(row.condition)}</TableCell>
                  <TableCell>{label(row.texture)}</TableCell>
                  <TableCell>{label(row.color_status)}</TableCell>
                  <TableCell>{label(row.scalp)}</TableCell>
                  <TableCell>
                    <Badge variant={row.complete ? "secondary" : "outline"}>
                      {row.complete ? "Saqlangan" : "Tugallanmagan"}
                    </Badge>
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
