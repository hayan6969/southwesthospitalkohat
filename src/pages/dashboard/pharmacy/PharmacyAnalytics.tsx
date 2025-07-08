
import { useState } from "react";
import AppLayout from "@/layouts/AppLayout";
import { usePharmacyStats, usePharmacyInvoices, useMedicines } from "@/hooks/useDatabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Package, ShoppingCart, AlertTriangle } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { formatPkrCurrency } from "@/utils/currency";

export default function PharmacyAnalytics() {
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: invoices } = usePharmacyInvoices();
  const { data: medicines } = useMedicines();
  const [timeRange, setTimeRange] = useState("7");

  const getDaysArray = (days: number) => {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      result.push(startOfDay(subDays(new Date(), i)));
    }
    return result;
  };

  const generateSalesData = () => {
    const days = getDaysArray(parseInt(timeRange));
    return days.map(day => {
      const dayInvoices = invoices?.filter(invoice => 
        format(new Date(invoice.created_at), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ) || [];
      
      const revenue = dayInvoices.reduce((sum, invoice) => sum + invoice.final_amount, 0);
      const sales = dayInvoices.length;
      
      return {
        date: format(day, 'MMM dd'),
        revenue,
        sales
      };
    });
  };

  const generateTopMedicines = () => {
    const medicinesSold = new Map();
    
    invoices?.forEach(invoice => {
      invoice.pharmacy_invoice_items?.forEach(item => {
        const medicineName = item.medicine?.name || 'Unknown';
        const current = medicinesSold.get(medicineName) || { quantity: 0, revenue: 0 };
        medicinesSold.set(medicineName, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + item.total_price
        });
      });
    });

    return Array.from(medicinesSold.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  };

  const generateStockAnalysis = () => {
    if (!medicines) return [];
    
    const categories = [
      { name: 'In Stock', value: medicines.filter(m => m.stock_quantity > m.minimum_stock_level).length, color: '#10b981' },
      { name: 'Low Stock', value: medicines.filter(m => m.stock_quantity <= m.minimum_stock_level && m.stock_quantity > 0).length, color: '#f59e0b' },
      { name: 'Out of Stock', value: medicines.filter(m => m.stock_quantity === 0).length, color: '#ef4444' }
    ];
    
    return categories;
  };

  const salesData = generateSalesData();
  const topMedicines = generateTopMedicines();
  const stockAnalysis = generateStockAnalysis();

  if (statsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Analytics</h1>
            <p className="text-gray-600 mt-1">Sales performance and inventory insights</p>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPkrCurrency(stats?.totalRevenue || 0)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalInvoices || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMedicines || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.lowStockCount || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Sales Trends</TabsTrigger>
            <TabsTrigger value="medicines">Top Medicines</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Sales Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={{}} className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sales" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="medicines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Medicines</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMedicines} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="quantity" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stockAnalysis}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stockAnalysis.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
