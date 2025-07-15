import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Coins, TrendingUp, Users, Clock, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DoctorPaymentStatus } from "./DoctorPaymentStatus";

export function DoctorAnalytics() {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['doctor-analytics', profile?.id, dateRange],
    queryFn: async () => {
      if (!profile?.id) return null;

      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      // Fetch appointments for this doctor
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          payment_status,
          type,
          patient_id,
          created_at
        `)
        .eq('doctor_id', profile.id)
        .gte('appointment_date', fromDate)
        .lte('appointment_date', toDate);

      // Fetch invoices related to this doctor's appointments
      const appointmentIds = appointments?.map(apt => apt.id) || [];
      const patientIds = appointments?.map(apt => apt.patient_id) || [];

      let invoices = [];
      if (patientIds.length > 0) {
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('*')
          .in('patient_id', patientIds)
          .gte('created_at', fromDate)
          .lte('created_at', toDate);
        invoices = invoiceData || [];
      }

      // Fetch medical records
      const { data: medicalRecords } = await supabase
        .from('medical_records')
        .select('*')
        .eq('doctor_id', profile.id)
        .gte('visit_date', fromDate)
        .lte('visit_date', toDate);

      // Fetch doctor's consultation fee
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('consultation_fee')
        .eq('id', profile.id)
        .single();

      return {
        appointments: appointments || [],
        invoices: invoices || [],
        medicalRecords: medicalRecords || [],
        consultationFee: doctorData?.consultation_fee || 0
      };
    },
    enabled: !!profile?.id,
    refetchInterval: 30000
  });

  const analytics = useMemo(() => {
    if (!analyticsData) return null;

    const { appointments, invoices, medicalRecords, consultationFee } = analyticsData;

    // Calculate earnings
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    const paidAppointments = appointments.filter(apt => apt.payment_status === 'paid');
    
    const totalEarnings = completedAppointments.length * consultationFee;
    const receivedEarnings = paidAppointments.length * consultationFee;
    const pendingEarnings = totalEarnings - receivedEarnings;

    // This month's earnings
    const thisMonth = new Date();
    const thisMonthStart = startOfMonth(thisMonth);
    const thisMonthAppointments = completedAppointments.filter(apt => 
      new Date(apt.appointment_date) >= thisMonthStart
    );
    const thisMonthEarnings = thisMonthAppointments.length * consultationFee;

    // Monthly breakdown
    const monthlyData: Record<string, { completed: number; scheduled: number; cancelled: number; rescheduled: number; total: number }> = {};
    appointments.forEach(apt => {
      const month = format(new Date(apt.appointment_date), 'MMM yyyy');
      if (!monthlyData[month]) {
        monthlyData[month] = { completed: 0, scheduled: 0, cancelled: 0, rescheduled: 0, total: 0 };
      }
      const status = apt.status as keyof typeof monthlyData[string];
      if (status in monthlyData[month]) {
        monthlyData[month][status] = (monthlyData[month][status] || 0) + 1;
      }
      monthlyData[month].total += 1;
    });

    const chartData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      completed: data.completed,
      scheduled: data.scheduled,
      cancelled: data.cancelled,
      rescheduled: data.rescheduled,
      total: data.total,
      earnings: data.completed * consultationFee
    }));

    // Status distribution
    const statusData = {
      completed: appointments.filter(apt => apt.status === 'completed').length,
      scheduled: appointments.filter(apt => apt.status === 'scheduled').length,
      cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
      rescheduled: appointments.filter(apt => apt.status === 'rescheduled').length
    };

    const statusChartData = Object.entries(statusData).map(([status, count]) => ({
      name: status,
      value: count
    }));

    return {
      totalAppointments: appointments.length,
      completedAppointments: completedAppointments.length,
      totalEarnings,
      receivedEarnings,
      pendingEarnings,
      thisMonthEarnings,
      totalPatients: new Set(appointments.map(apt => apt.patient_id)).size,
      medicalRecordsCount: medicalRecords.length,
      chartData,
      statusChartData,
      consultationFee
    };
  }, [analyticsData]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (isLoading) {
    return (
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          <TabsTrigger value="payments">Payment Status</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <DoctorPaymentStatus />
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <Tabs defaultValue="analytics" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        <TabsTrigger value="payments">Payment Status</TabsTrigger>
      </TabsList>

      <TabsContent value="analytics" className="space-y-6 mt-6">
        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Doctor Analytics Dashboard</CardTitle>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-auto justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{
                        from: dateRange.from,
                        to: dateRange.to
                      }}
                      onSelect={(range) => {
                        if (range?.from) {
                          setDateRange({
                            from: range.from,
                            to: range.to || range.from
                          });
                        }
                      }}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Button 
                  variant="outline" 
                  onClick={() => setDateRange({
                    from: startOfMonth(new Date()),
                    to: endOfMonth(new Date())
                  })}
                >
                  This Month
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPkrAmount(analytics?.totalEarnings || 0)}
                  </p>
                </div>
                <Coins className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                From {analytics?.completedAppointments || 0} completed appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatPkrAmount(analytics?.thisMonthEarnings || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Consultation fee: {formatPkrAmount(analytics?.consultationFee || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Patients Treated</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {analytics?.totalPatients || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {analytics?.totalAppointments || 0} total appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medical Records</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {analytics?.medicalRecordsCount || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Records created in period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Received</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatPkrAmount(analytics?.receivedEarnings || 0)}
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700">Paid</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatPkrAmount(analytics?.pendingEarnings || 0)}
                  </p>
                </div>
                <Badge className="bg-orange-100 text-orange-700">Pending</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Collection Rate</p>
                  <p className="text-xl font-bold text-blue-600">
                    {analytics?.totalEarnings ? 
                      Math.round((analytics.receivedEarnings / analytics.totalEarnings) * 100) : 0}%
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Earnings Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics?.chartData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'earnings' ? formatPkrAmount(value as number) : value,
                      name === 'earnings' ? 'Earnings' : typeof name === 'string' ? name.charAt(0).toUpperCase() + name.slice(1) : name
                    ]}
                  />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                  <Bar dataKey="earnings" fill="#3b82f6" name="Earnings" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Appointment Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics?.statusChartData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics?.statusChartData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="payments" className="mt-6">
        <DoctorPaymentStatus />
      </TabsContent>
    </Tabs>
  );
}