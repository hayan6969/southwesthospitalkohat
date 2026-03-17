import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MapPin } from "lucide-react";

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#a855f7", "#d946ef"
];

export function RegionWiseReport() {
  const { data: regionData, isLoading } = useQuery({
    queryKey: ["patient-regions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("city, province");

      if (error) throw error;

      // Count by city
      const cityMap: Record<string, number> = {};
      let noCity = 0;
      (data || []).forEach((p: any) => {
        if (p.city) {
          cityMap[p.city] = (cityMap[p.city] || 0) + 1;
        } else {
          noCity++;
        }
      });

      const cityData = Object.entries(cityMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      if (noCity > 0) {
        cityData.push({ name: "Unknown", value: noCity });
      }

      return { cityData, total: data?.length || 0 };
    },
    refetchInterval: 30000,
  });

  const cityData = regionData?.cityData || [];
  const total = regionData?.total || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Patient Regions
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

  if (cityData.length === 0 || (cityData.length === 1 && cityData[0].name === "Unknown")) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Patient Regions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <MapPin className="w-8 h-8 opacity-30" />
            <p>No region data yet.</p>
            <p className="text-xs">City info is captured during patient registration.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600" />
          Patient Regions
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
                data={cityData}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {cityData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} patients`,
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
        {/* Top cities table */}
        <div className="mt-3 space-y-1.5">
          {cityData.slice(0, 5).map((city, i) => (
            <div
              key={city.name}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-foreground font-medium">{city.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {city.value} patients
                </span>
                <span className="text-xs text-muted-foreground">
                  ({((city.value / total) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
