import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { usePharmacyStats, usePharmacyInvoices, useMedicines } from "@/hooks/useDatabase";
import { TrendingUp, Banknote, Package, ShoppingCart, AlertTriangle, FileText, Calendar, User, Receipt } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { PharmacyInvoiceDetailsDialog } from "@/components/dialogs/PharmacyInvoiceDetailsDialog";
import { PharmacyAccountDialog } from "@/components/dialogs/PharmacyAccountDialog";
import { PharmacyExpensesDialog } from "@/components/dialogs/PharmacyExpensesDialog";

export default function FinancePharmacy() {
  const { data: stats, isLoading: statsLoading } = usePharmacyStats();
  const { data: invoices, isLoading: invoicesLoading } = usePharmacyInvoices();
  const { data: medicines, isLoading: medicinesLoading } = useMedicines();
  const [timeRange, setTimeRange] = useState("30");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);

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
      .sort((a, b) => b.revenue - a.revenue)
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

  const handleViewInvoiceDetails = (invoice: any) => {
    setSelectedInvoice(invoice);
    setDetailsDialogOpen(true);
  };

  const salesData = generateSalesData();
  const topMedicines = generateTopMedicines();
  const stockAnalysis = generateStockAnalysis();
  const recentInvoices = invoices?.slice(0, 10) || [];

  // Calculate financial metrics
  const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.final_amount, 0) || 0;
  const totalSales = invoices?.length || 0;
  const averageTransactionValue = totalSales > 0 ? totalRevenue / totalSales : 0;
  const lowStockCount = medicines?.filter(m => m.stock_quantity <= m.minimum_stock_level).length || 0;

  if (statsLoading || invoicesLoading || medicinesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pharmacy Financial Overview</h1>
          <p className="text-gray-600 mt-1">Monitor pharmacy sales performance, revenue trends, and inventory status</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setAccountDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Pharmacy Account
          </Button>
          
          <Button 
            onClick={() => setExpensesDialogOpen(true)}
            variant="outline"
            className="border-orange-600 text-orange-600 hover:bg-orange-50"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Pharmacy Expenses
          </Button>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Pharmacy sales revenue</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalSales}</div>
            <p className="text-xs text-muted-foreground">Completed sales</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transaction Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatPkrAmount(averageTransactionValue)}</div>
            <p className="text-xs text-muted-foreground">Revenue per sale</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items need restocking</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Status</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
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
                      <Bar dataKey="sales" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Revenue Generating Medicines</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMedicines} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Pharmacy Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {invoice.customer_name || 'Walk-in Customer'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(new Date(invoice.created_at), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>{invoice.pharmacy_invoice_items?.length || 0}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatPkrAmount(invoice.final_amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewInvoiceDetails(invoice)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Low Stock Medicines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {medicines?.filter(m => m.stock_quantity <= m.minimum_stock_level).map((medicine) => (
                    <div key={medicine.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                      <div>
                        <p className="font-medium text-red-900">{medicine.name}</p>
                        <p className="text-sm text-red-600">Current: {medicine.stock_quantity} | Min: {medicine.minimum_stock_level}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-700">
                          {medicine.stock_quantity === 0 ? 'Out of Stock' : 'Low Stock'}
                        </p>
                      </div>
                    </div>
                  )) || []}
                  {medicines?.filter(m => m.stock_quantity <= m.minimum_stock_level).length === 0 && (
                    <p className="text-center text-gray-500 py-8">All medicines are adequately stocked</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <PharmacyInvoiceDetailsDialog
        invoice={selectedInvoice}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />

      <PharmacyAccountDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
      />

      <PharmacyExpensesDialog
        open={expensesDialogOpen}
        onOpenChange={setExpensesDialogOpen}
      />
    </div>
  );
}