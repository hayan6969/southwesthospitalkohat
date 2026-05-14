import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

type Bed = {
  id: string;
  ward_id: string;
  bed_number: string;
  daily_charge: number;
  status: string;
};
type Ward = { id: string; name: string; ward_type: string; floor: string | null };

const STATUS_STYLES: Record<string, { bg: string; ring: string; label: string }> = {
  available: { bg: "bg-emerald-50 hover:bg-emerald-100", ring: "ring-emerald-300", label: "text-emerald-700" },
  occupied: { bg: "bg-rose-50 hover:bg-rose-100", ring: "ring-rose-300", label: "text-rose-700" },
  maintenance: { bg: "bg-amber-50 hover:bg-amber-100", ring: "ring-amber-300", label: "text-amber-700" },
  reserved: { bg: "bg-sky-50 hover:bg-sky-100", ring: "ring-sky-300", label: "text-sky-700" },
};

export function BedDashboard() {
  const qc = useQueryClient();

  const { data: wards = [] } = useQuery({
    queryKey: ["wards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wards").select("*").order("name");
      if (error) throw error;
      return data as Ward[];
    },
  });

  const { data: beds = [], isLoading } = useQuery({
    queryKey: ["beds-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("beds").select("*").order("bed_number");
      if (error) throw error;
      return data as Bed[];
    },
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel("beds-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "beds" }, () => {
        qc.invalidateQueries({ queryKey: ["beds-overview"] });
        qc.invalidateQueries({ queryKey: ["beds"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ipd_admissions" }, () => {
        qc.invalidateQueries({ queryKey: ["beds-overview"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const stats = useMemo(() => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === "occupied").length;
    const available = beds.filter((b) => b.status === "available").length;
    const maintenance = beds.filter((b) => b.status === "maintenance").length;
    const reserved = beds.filter((b) => b.status === "reserved").length;
    const occRate = total > 0 ? Math.round((occupied / total) * 100) : 0;
    return { total, occupied, available, maintenance, reserved, occRate };
  }, [beds]);

  const bedsByWard = useMemo(() => {
    const map = new Map<string, Bed[]>();
    beds.forEach((b) => {
      const arr = map.get(b.ward_id) ?? [];
      arr.push(b);
      map.set(b.ward_id, arr);
    });
    return map;
  }, [beds]);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<BedDouble className="w-4 h-4" />} label="Total Beds" value={stats.total} tone="default" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Available" value={stats.available} tone="emerald" />
        <StatCard icon={<BedDouble className="w-4 h-4" />} label="Occupied" value={stats.occupied} tone="rose" />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Maintenance" value={stats.maintenance} tone="amber" />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Occupancy" value={`${stats.occRate}%`} tone="sky" />
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading bed map...</CardContent></Card>
      ) : wards.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No wards configured. Add a ward to begin.</CardContent></Card>
      ) : (
        wards.map((w) => {
          const ward_beds = bedsByWard.get(w.id) ?? [];
          const occ = ward_beds.filter((b) => b.status === "occupied").length;
          return (
            <Card key={w.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    {w.name}
                    <Badge variant="secondary" className="capitalize">{w.ward_type.replace("_", " ")}</Badge>
                    {w.floor && <span className="text-xs text-muted-foreground">Floor {w.floor}</span>}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {occ}/{ward_beds.length} occupied
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {ward_beds.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">No beds in this ward.</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {ward_beds.map((b) => {
                      const s = STATUS_STYLES[b.status] ?? STATUS_STYLES.available;
                      return (
                        <div
                          key={b.id}
                          title={`${b.bed_number} • ${b.status} • PKR ${Number(b.daily_charge).toLocaleString()}/day`}
                          className={`rounded-md border p-2 text-center cursor-help transition-colors ring-1 ${s.ring} ${s.bg}`}
                        >
                          <BedDouble className={`w-5 h-5 mx-auto ${s.label}`} />
                          <div className="text-xs font-semibold mt-1">{b.bed_number}</div>
                          <div className={`text-[10px] capitalize ${s.label}`}>{b.status}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number | string; tone: "default" | "emerald" | "rose" | "amber" | "sky" }) {
  const tones: Record<string, string> = {
    default: "bg-card",
    emerald: "bg-emerald-50 border-emerald-200",
    rose: "bg-rose-50 border-rose-200",
    amber: "bg-amber-50 border-amber-200",
    sky: "bg-sky-50 border-sky-200",
  };
  return (
    <Card className={tones[tone]}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground text-xs">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
