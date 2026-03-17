import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { MapPin, TrendingUp, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AdminDashboardNav } from "@/components/AdminDashboardNav";
import { useAuth } from "@/hooks/useAuth";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

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

const CITY_COLORS = [
  "#2563eb", "#dc2626", "#059669", "#d97706", "#7c3aed",
  "#db2777", "#0891b2", "#ea580c", "#4f46e5", "#16a34a",
];

export default function AdminRegions() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { settings: hospitalSettings } = useHospitalSettings();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-region-analytics"],
    queryFn: async () => {
      const { data: patients, error } = await supabase
        .from("patients")
        .select("city, province");

      if (error) throw error;

      const provinceMap: Record<string, number> = {};
      const cityMap: Record<string, number> = {};
      let total = patients?.length || 0;

      (patients || []).forEach((p: any) => {
        const prov = p.province || "Unknown";
        provinceMap[prov] = (provinceMap[prov] || 0) + 1;
        if (p.city) {
          cityMap[p.city] = (cityMap[p.city] || 0) + 1;
        }
      });

      const provinceData = Object.entries(provinceMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const topCities = Object.entries(cityMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      return { provinceData, topCities, total };
    },
    refetchInterval: 30000,
  });

  const provinceData = data?.provinceData || [];
  const topCities = data?.topCities || [];
  const total = data?.total || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {hospitalSettings?.logo_url ? (
                <img src={hospitalSettings.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
              ) : (
                <span className="inline-block w-2 h-6 bg-blue-500 rounded-full" />
              )}
              {hospitalSettings?.hospital_name || "HIMS"}
            </h1>
            <p className="text-gray-500 text-xs mt-0.5">Region-wise Patient Analytics</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-purple-200">
                <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-bold">
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {profile?.first_name} {profile?.last_name}
                </span>
                <span className="text-xs text-gray-600">{profile?.email}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="flex items-center gap-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 text-xs"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/admin")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="w-6 h-6 text-blue-600" />
                Region Analytics
              </h2>
            </div>
            <AdminDashboardNav />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-6">
              {/* Top Cities Cards */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Top Cities
                </h3>
                {topCities.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>No city data available yet. City is captured during patient registration.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {topCities.map((city, i) => (
                      <Card key={city.name} className="relative overflow-hidden">
                        <div
                          className="absolute top-0 left-0 w-full h-1"
                          style={{ backgroundColor: CITY_COLORS[i % CITY_COLORS.length] }}
                        />
                        <CardContent className="pt-5 pb-4 px-4 text-center">
                          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                            #{i + 1}
                          </div>
                          <div className="text-lg font-bold text-foreground">{city.name}</div>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm font-semibold text-muted-foreground">
                              {city.value} patients
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {total > 0 ? ((city.value / total) * 100).toFixed(1) : 0}% of total
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Province-wise Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Province-wise Patient Distribution
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      {total} total patients
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {provinceData.length === 0 || (provinceData.length === 1 && provinceData[0].name === "Unknown") ? (
                    <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground">
                      <MapPin className="w-10 h-10 mb-2 opacity-30" />
                      <p>No province data available yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Chart */}
                      <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={provinceData}
                              cx="50%"
                              cy="45%"
                              innerRadius={60}
                              outerRadius={120}
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
                            <Legend verticalAlign="bottom" iconType="circle" iconSize={10} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Province breakdown table */}
                      <div className="space-y-3 flex flex-col justify-center">
                        {provinceData.map((prov) => {
                          const pct = total > 0 ? ((prov.value / total) * 100).toFixed(1) : "0";
                          const color = PROVINCE_COLORS[prov.name] || "#9ca3af";
                          return (
                            <div key={prov.name} className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-sm text-foreground truncate">
                                    {prov.name}
                                  </span>
                                  <span className="text-sm text-muted-foreground ml-2 shrink-0">
                                    {prov.value} ({pct}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                                  <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                      width: `${pct}%`,
                                      backgroundColor: color,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
