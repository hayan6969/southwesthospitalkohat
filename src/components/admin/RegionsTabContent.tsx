import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { MapPin, Users, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

const PROVINCE_SHORT: Record<string, string> = {
  "Punjab": "Punjab",
  "Sindh": "Sindh",
  "Khyber Pakhtunkhwa": "KPK",
  "Balochistan": "Balochistan",
  "Islamabad Capital Territory": "ICT",
  "Azad Jammu & Kashmir": "AJK",
  "Gilgit-Baltistan": "GB",
  "Unknown": "Unknown",
};

interface ProvinceData {
  name: string;
  value: number;
  cities: { name: string; value: number }[];
}

export function RegionsTabContent() {
  const [expandedProvince, setExpandedProvince] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-region-analytics-detailed"],
    queryFn: async () => {
      const { data: patients, error } = await supabase
        .from("patients")
        .select("city, province");

      if (error) throw error;

      const provinceCityMap: Record<string, Record<string, number>> = {};
      let total = patients?.length || 0;

      (patients || []).forEach((p: any) => {
        const prov = p.province || "Unknown";
        const city = p.city || "Unknown";
        if (!provinceCityMap[prov]) provinceCityMap[prov] = {};
        provinceCityMap[prov][city] = (provinceCityMap[prov][city] || 0) + 1;
      });

      const provinceData: ProvinceData[] = Object.entries(provinceCityMap)
        .map(([provName, cities]) => {
          const cityList = Object.entries(cities)
            .map(([cityName, count]) => ({ name: cityName, value: count }))
            .sort((a, b) => b.value - a.value);
          const provTotal = cityList.reduce((s, c) => s + c.value, 0);
          return { name: provName, value: provTotal, cities: cityList };
        })
        .sort((a, b) => b.value - a.value);

      return { provinceData, total };
    },
    refetchInterval: 30000,
  });

  const provinceData = data?.provinceData || [];
  const total = data?.total || 0;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  if (provinceData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MapPin className="w-10 h-10 mb-2 opacity-30" />
        <p>No region data available yet.</p>
      </div>
    );
  }

  const toggleProvince = (name: string) => {
    setExpandedProvince(prev => prev === name ? null : name);
  };

  return (
    <div className="space-y-6">
      {/* Province Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {provinceData.map((prov) => {
          const color = PROVINCE_COLORS[prov.name] || "#9ca3af";
          const shortName = PROVINCE_SHORT[prov.name] || prov.name;
          const pct = total > 0 ? ((prov.value / total) * 100).toFixed(1) : "0";

          return (
            <Card
              key={prov.name}
              className="cursor-pointer transition-all hover:shadow-md border-l-4"
              style={{ borderLeftColor: color }}
              onClick={() => toggleProvince(prov.name)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                    {shortName}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {prov.cities.length} {prov.cities.length === 1 ? "city" : "cities"}
                  </Badge>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground">{prov.value}</div>
                <div className="text-xs text-muted-foreground">patients ({pct}%)</div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Province Detail Cards with City Bar Charts */}
      <div className="space-y-4">
        {provinceData.map((prov) => {
          const color = PROVINCE_COLORS[prov.name] || "#9ca3af";
          const shortName = PROVINCE_SHORT[prov.name] || prov.name;
          const isExpanded = expandedProvince === prov.name;
          const topCities = prov.cities.slice(0, 10);

          return (
            <Collapsible key={prov.name} open={isExpanded} onOpenChange={() => toggleProvince(prov.name)}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full text-left">
                  <CardHeader className="pb-2 px-4 sm:px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <CardTitle className="text-sm sm:text-base flex-1 flex items-center gap-2">
                        {prov.name}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({shortName})
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-bold text-foreground">{prov.value}</span>
                          <span className="text-xs text-muted-foreground ml-1">patients</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-3 sm:px-6 pb-4 pt-0">
                    {topCities.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-sm">No city data</div>
                    ) : (
                      <div className="h-[280px] sm:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={topCities}
                            layout="vertical"
                            margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" fontSize={11} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={100}
                              fontSize={11}
                              tick={{ fill: "hsl(var(--foreground))" }}
                            />
                            <Tooltip
                              formatter={(value: number) => [`${value} patients`, "Patients"]}
                              labelFormatter={(label) => `${label}, ${shortName}`}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {topCities.map((city, idx) => (
                                <Cell
                                  key={city.name}
                                  fill={color}
                                  fillOpacity={1 - idx * 0.07}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {prov.cities.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Showing top 10 of {prov.cities.length} cities
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
