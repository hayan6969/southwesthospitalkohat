
import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { usePharmacyAnalytics } from "@/hooks/usePharmacyAnalytics";
import { useFilteredTopProducts } from "@/hooks/useFilteredTopProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Banknote, Package, ShoppingCart, AlertTriangle, RotateCcw, Calendar, Activity, Percent, Building2, X } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";

export default function PharmacyAnalytics() {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  
  // Create the month filter string for the hook
  const monthFilter = selectedYear && selectedMonth ? `${selectedYear}-${selectedMonth.padStart(2, '0')}` : "";
  
  const { data: analytics, isLoading } = usePharmacyAnalytics();
  const { data: filteredTopProducts, isLoading: isLoadingFiltered } = useFilteredTopProducts(monthFilter);

  const clearFilters = () => {
    setSelectedYear("");
    setSelectedMonth("");
  };

  if (isLoading) {
    return (
      <AppLayout sidebarRole="head_pharmacist">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Prepare stock status data
  const stockStatusData = [
    { name: 'In Stock', value: (analytics?.totalMedicines || 0) - (analytics?.lowStockCount || 0) - (analytics?.expiredCount || 0), color: '#10b981' },
    { name: 'Low Stock', value: analytics?.lowStockCount || 0, color: '#f59e0b' },
    { name: 'Expired', value: analytics?.expiredCount || 0, color: '#ef4444' }
  ];

  return (
    <AppLayout sidebarRole="head_pharmacist">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Analytics</h1>
            <p className="text-gray-600 mt-1">Real-time financial insights and performance metrics</p>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Activity className="w-3 h-3 mr-1" />
            Live Data
          </Badge>
        </div>

        {/* Key Metrics - Today */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Today's Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                <Banknote className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatPkrAmount(analytics?.todayRevenue || 0)}</div>
                <p className="text-xs text-gray-600 mt-1">Net revenue after returns</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(analytics?.todayProfit || 0)}</div>
                <p className="text-xs text-gray-600 mt-1">Gross profit after costs</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Returns</CardTitle>
                <RotateCcw className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatPkrAmount(analytics?.todayReturns || 0)}</div>
                <p className="text-xs text-gray-600 mt-1">Total returns and refunds</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
                <ShoppingCart className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{analytics?.todaySales || 0}</div>
                <p className="text-xs text-gray-600 mt-1">Number of transactions</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Key Metrics - Monthly */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Monthly Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <Banknote className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatPkrAmount(analytics?.monthlyRevenue || 0)}</div>
                <div className="flex items-center mt-2">
                  <Percent className="w-3 h-3 text-gray-400 mr-1" />
                  <span className="text-xs text-gray-600">
                    {analytics?.monthlyProfitMargin?.toFixed(1) || 0}% profit margin
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatPkrAmount(analytics?.monthlyProfit || 0)}</div>
                <p className="text-xs text-gray-600 mt-1">Net profit this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Returns</CardTitle>
                <RotateCcw className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatPkrAmount(analytics?.monthlyReturns || 0)}</div>
                <p className="text-xs text-gray-600 mt-1">Total returns this month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
                <ShoppingCart className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{analytics?.monthlySales || 0}</div>
                <p className="text-xs text-gray-600 mt-1">Transactions this month</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pay Hospital Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Payment Due</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pay Hospital</CardTitle>
                <Building2 className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatPkrAmount(analytics?.payHospitalAmount || 0)}</div>
                <p className="text-xs text-gray-600 mt-1">Profit amount due to hospital</p>
                <p className="text-xs text-gray-500 mt-2">Resets after daily closing button is pressed</p>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">About Hospital Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• This amount represents the pharmacy's profit share that must be paid to the hospital</p>
                  <p>• Calculated as: (Selling Price - Purchase Price) × Quantity sold, minus returns</p>
                  <p>• Amount accumulates from the last daily closing until the next closing</p>
                  <p>• Finance team manually performs daily closing using the closing button, which resets this amount to zero</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
            <TabsTrigger value="profit">Profit Analysis</TabsTrigger>
            <TabsTrigger value="products">Top Products</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue vs Returns (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics?.dailyData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                          formatter={(value, name) => [
                            formatPkrAmount(Number(value)), 
                            name === 'revenue' ? 'Revenue' : name === 'returns' ? 'Returns' : name
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stackId="1"
                          stroke="#10b981" 
                          fill="#10b981" 
                          fillOpacity={0.6}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="returns" 
                          stackId="2"
                          stroke="#ef4444" 
                          fill="#ef4444" 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales Count (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics?.dailyData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sales" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Profit Analysis (Last 30 Days)</CardTitle>
                <p className="text-sm text-gray-600">Profit calculation includes cost of goods and deducts returns</p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.dailyData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                        formatter={(value) => [formatPkrAmount(Number(value)), 'Profit']}
                      />
                      <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div>
                    <CardTitle>Top Selling Medicines</CardTitle>
                    <p className="text-sm text-gray-600">Based on revenue and profit contribution</p>
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-full sm:w-32">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                    {(selectedYear || selectedMonth) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearFilters}
                        className="flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoadingFiltered ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <>
                      {(monthFilter ? filteredTopProducts : analytics?.topMedicines)?.slice(0, 8).map((medicine, index) => (
                        <div key={medicine.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{medicine.name}</p>
                              <p className="text-sm text-gray-600">Qty: {medicine.quantity} units</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatPkrAmount(medicine.revenue)}</p>
                            <p className="text-sm text-blue-600">Profit: {formatPkrAmount(medicine.profit)}</p>
                          </div>
                        </div>
                      )) || []}
                      {((monthFilter ? filteredTopProducts : analytics?.topMedicines)?.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          No products found for the selected period
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analytics?.totalMedicines || 0}</div>
                      <div className="text-sm text-gray-600">Total Medicines</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{analytics?.lowStockCount || 0}</div>
                      <div className="text-sm text-gray-600">Low Stock</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{analytics?.expiredCount || 0}</div>
                      <div className="text-sm text-gray-600">Expired</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stock Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stockStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stockStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <p className="text-sm text-gray-600">Latest sales and returns transactions</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.recentActivity?.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === 'sale' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {activity.type === 'sale' ? (
                            <ShoppingCart className="w-4 h-4 text-green-600" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(activity.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          activity.type === 'sale' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {activity.type === 'sale' ? '+' : '-'}{formatPkrAmount(activity.amount)}
                        </p>
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
