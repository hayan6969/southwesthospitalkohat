import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { MapPin, TrendingUp, Users, ChevronDown, ChevronRight } from "lucide-react";
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

  const toggleProvince = (name: string) => {
    setExpandedProvince(prev => prev === name ? null : name);
  };

  // Top 10 cities across all provinces
  const allCities = provinceData.flatMap(p =>
    p.cities.filter(c => c.name !== "Unknown").map(c => ({ ...c, province: p.name }))
  ).sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Province Overview Chart + Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Province Donut */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Province-wise Distribution
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {total} patients
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {provinceData.length === 0 || (provinceData.length === 1 && provinceData[0].name === "Unknown") ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <MapPin className="w-10 h-10 mb-2 opacity-30" />
                <p>No province data available yet.</p>
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={provinceData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={105}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {provinceData.map((entry) => (
                        <Cell key={entry.name} fill={PROVINCE_COLORS[entry.name] || "#9ca3af"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} patients (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                        name,
                      ]}
                    />
                    <Legend verticalAlign="bottom" iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Cities Bar Chart */}
        <Card>
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top 10 Cities
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {allCities.length === 0 ? (
              <div className="h-[320px] flex flex-col items-center justify-center text-muted-foreground">
                <MapPin className="w-10 h-10 mb-2 opacity-30" />
                <p>No city data available yet.</p>
              </div>
            ) : (
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allCities} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={100} fontSize={11} tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      formatter={(value: number, _: any, props: any) => [
                        `${value} patients`,
                        `${props.payload.name} (${props.payload.province})`
                      ]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {allCities.map((city) => (
                        <Cell key={city.name} fill={PROVINCE_COLORS[city.province] || "#9ca3af"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Province → City Detailed Breakdown */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Province &amp; City Breakdown
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              Click a province to see cities
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-0">
          {provinceData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No data available.</div>
          ) : (
            <div className="divide-y">
              {provinceData.map((prov) => {
                const pct = total > 0 ? ((prov.value / total) * 100).toFixed(1) : "0";
                const color = PROVINCE_COLORS[prov.name] || "#9ca3af";
                const isExpanded = expandedProvince === prov.name;

                return (
                  <Collapsible key={prov.name} open={isExpanded} onOpenChange={() => toggleProvince(prov.name)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">{prov.name}</span>
                            <Badge variant="secondary" className="text-xs">{prov.cities.length} {prov.cities.length === 1 ? 'city' : 'cities'}</Badge>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-foreground">{prov.value}</div>
                          <div className="text-xs text-muted-foreground">{pct}%</div>
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="bg-muted/30 px-4 sm:px-6 py-3">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-b">
                              <TableHead className="text-xs font-semibold w-[50px]">#</TableHead>
                              <TableHead className="text-xs font-semibold">City</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Patients</TableHead>
                              <TableHead className="text-xs font-semibold text-right">% of Province</TableHead>
                              <TableHead className="text-xs font-semibold text-right">% of Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {prov.cities.map((city, idx) => (
                              <TableRow key={city.name}>
                                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell className="text-sm font-medium">{city.name}</TableCell>
                                <TableCell className="text-sm text-right font-semibold">{city.value}</TableCell>
                                <TableCell className="text-xs text-right text-muted-foreground">
                                  {prov.value > 0 ? ((city.value / prov.value) * 100).toFixed(1) : "0"}%
                                </TableCell>
                                <TableCell className="text-xs text-right text-muted-foreground">
                                  {total > 0 ? ((city.value / total) * 100).toFixed(1) : "0"}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
