import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Coins, Calendar as CalendarIcon, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";

interface DoctorPayment {
  id: string;
  period_start: string;
  period_end: string;
  appointment_count: number;
  ot_count: number;
  consultation_earnings: number;
  ot_earnings: number;
  total_earnings: number;
  payment_status: 'pending' | 'paid' | 'processing';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export function DoctorPaymentStatus() {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['doctor-payments-status', profile?.id, dateRange],
    queryFn: async () => {
      if (!profile?.id) return [];

      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('doctor_payments')
        .select('*')
        .eq('doctor_id', profile.id)
        .gte('period_start', startDate)
        .lte('period_end', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DoctorPayment[];
    },
    enabled: !!profile?.id,
    refetchInterval: 5000
  });

  // Get unpaid earnings from completed appointments
  const { data: unpaidEarnings, isLoading: earningsLoading } = useQuery({
    queryKey: ['doctor-unpaid-earnings', profile?.id, dateRange, payments],
    queryFn: async () => {
      if (!profile?.id) return { appointmentCount: 0, otCount: 0, consultationEarnings: 0, otEarnings: 0, totalEarnings: 0 };

      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];

      // Get doctor's consultation fee
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('consultation_fee')
        .eq('id', profile.id)
        .single();

      const consultationFee = doctorData?.consultation_fee || 0;

      // Get all payment records to exclude already processed periods
      const { data: allPayments } = await supabase
        .from('doctor_payments')
        .select('period_start, period_end, payment_status')
        .eq('doctor_id', profile.id);

      const processedPeriods = allPayments || [];

      // Function to check if a date falls within any processed payment period
      const isInProcessedPeriod = (date: string) => {
        return processedPeriods.some(payment => 
          date >= payment.period_start && date <= payment.period_end
        );
      };

      // Get completed appointments that haven't been included in any payment record
      const { data: appointments } = await supabase
        .from('appointments')
        .select('id, appointment_date')
        .eq('doctor_id', profile.id)
        .eq('status', 'completed')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

      // Filter out appointments that are already in processed payment periods
      const unprocessedAppointments = appointments?.filter(apt => 
        !isInProcessedPeriod(apt.appointment_date.split('T')[0])
      ) || [];

      // Get completed OT operations that haven't been included in any payment record
      const { data: otOperations } = await supabase
        .from('ot_schedules')
        .select('doctor_expense, operation_date')
        .eq('doctor_id', profile.id)
        .eq('status', 'completed')
        .gte('operation_date', startDate)
        .lte('operation_date', endDate);

      // Filter out OT operations that are already in processed payment periods
      const unprocessedOtOperations = otOperations?.filter(op => 
        !isInProcessedPeriod(op.operation_date)
      ) || [];

      const appointmentCount = unprocessedAppointments.length;
      const otCount = unprocessedOtOperations.length;
      const consultationEarnings = appointmentCount * consultationFee;
      const otEarnings = unprocessedOtOperations.reduce((sum, op) => sum + (op.doctor_expense || 0), 0);
      const totalEarnings = consultationEarnings + otEarnings;

      return {
        appointmentCount,
        otCount,
        consultationEarnings,
        otEarnings,
        totalEarnings
      };
    },
    enabled: !!profile?.id,
    refetchInterval: 5000
  });

  const isLoading = paymentsLoading || earningsLoading;

  // Calculate totals including unpaid earnings
  const totalPending = (unpaidEarnings?.totalEarnings || 0) + 
    (payments?.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + p.total_earnings, 0) || 0);

  const totalReceived = payments?.filter(p => p.payment_status === 'paid')
    .reduce((sum, p) => sum + p.total_earnings, 0) || 0;

  const pendingPayments = payments?.filter(p => p.payment_status === 'pending') || [];
  const recentPayments = payments?.filter(p => p.payment_status === 'paid').slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Status</CardTitle>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-auto justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatPkrAmount(totalPending)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {(unpaidEarnings?.appointmentCount || 0) + pendingPayments.length} payment(s) pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPkrAmount(totalReceived)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All time earnings received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPkrAmount(totalPending + totalReceived)}
                </p>
              </div>
              <Coins className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Complete earnings summary
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current Month Unpaid Earnings */}
      {unpaidEarnings && unpaidEarnings.totalEarnings > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Current Month Unpaid Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-600">Appointments</p>
                <p className="text-2xl font-bold text-blue-700">{unpaidEarnings.appointmentCount}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-purple-600">OT Operations</p>
                <p className="text-2xl font-bold text-purple-700">{unpaidEarnings.otCount}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-600">Consultation</p>
                <p className="text-lg font-bold text-green-700">{formatPkrAmount(unpaidEarnings.consultationEarnings)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-orange-600">OT Earnings</p>
                <p className="text-lg font-bold text-orange-700">{formatPkrAmount(unpaidEarnings.otEarnings)}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-600">Total Unpaid Amount</p>
              <p className="text-2xl font-bold text-gray-800">{formatPkrAmount(unpaidEarnings.totalEarnings)}</p>
              <p className="text-xs text-gray-500 mt-1">Waiting for finance team to process payment</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Pending Payments (Finance Processing)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Appointments</TableHead>
                    <TableHead>OT Operations</TableHead>
                    <TableHead>Consultation</TableHead>
                    <TableHead>OT Earnings</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(payment.period_start), 'MMM d')} - {format(new Date(payment.period_end), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{payment.appointment_count}</TableCell>
                      <TableCell className="text-center">{payment.ot_count}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatPkrAmount(payment.consultation_earnings)}
                      </TableCell>
                      <TableCell className="text-blue-600 font-medium">
                        {formatPkrAmount(payment.ot_earnings)}
                      </TableCell>
                      <TableCell className="text-purple-600 font-bold">
                        {formatPkrAmount(payment.total_earnings)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-orange-100 text-orange-700">
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      {recentPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {format(new Date(payment.period_start), 'MMM d')} - {format(new Date(payment.period_end), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-green-600 font-bold">
                        {formatPkrAmount(payment.total_earnings)}
                      </TableCell>
                      <TableCell>
                        {payment.paid_at ? format(new Date(payment.paid_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-700">
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {payment.notes || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Payments Message */}
      {(!payments || payments.length === 0) && (!unpaidEarnings || unpaidEarnings.totalEarnings === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Payment Records</h3>
            <p className="text-sm text-muted-foreground">
              Complete appointments and OT operations to see your earnings here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}