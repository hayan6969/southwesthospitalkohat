import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MapPin } from "lucide-react";

const PROVINCE_COLORS: Record<string, string> = {
  "Punjab": "#3b82f6",
  "Sindh": "#ef4444",
  "Khyber Pakhtunkhwa": "#10b981",
  "Balochistan": "#f59e0b",
  "Islamabad Capital Territory": "#8b5cf6",
  "Azad Jammu & Kashmir": "#ec4899",
  "Gilgit-Baltistan": "#06b6d4",
  "Unknown": "#9ca3af",
};

export function RegionWiseReport() {
  const { data: regionData, isLoading } = useQuery({
    queryKey: ["patient-regions-overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("province");

      if (error) throw error;

      const provinceMap: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const prov = p.province || "Unknown";
        provinceMap[prov] = (provinceMap[prov] || 0) + 1;
      });

      const provinceData = Object.entries(provinceMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      return { provinceData, total: data?.length || 0 };
    },
    refetchInterval: 30000,
  });

  const provinceData = regionData?.provinceData || [];
  const total = regionData?.total || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Patient Provinces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (provinceData.length === 0 || (provinceData.length === 1 && provinceData[0].name === "Unknown")) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Patient Provinces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <MapPin className="w-8 h-8 opacity-30" />
            <p>No province data yet.</p>
            <p className="text-xs">Province is captured during patient registration.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Patient Provinces
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {total} total patients
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={provinceData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {provinceData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={PROVINCE_COLORS[entry.name] || "#9ca3af"}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} patients (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                  name,
                ]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Province breakdown */}
        <div className="mt-3 space-y-1.5">
          {provinceData.map((prov) => {
            const pct = total > 0 ? ((prov.value / total) * 100).toFixed(1) : "0";
            const color = PROVINCE_COLORS[prov.name] || "#9ca3af";
            return (
              <div key={prov.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-foreground font-medium">{prov.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{prov.value} patients</span>
                  <span className="text-xs text-muted-foreground">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
