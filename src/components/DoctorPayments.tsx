import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Banknote, Users, ClipboardList, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DoctorPayment {
  id: string;
  doctor_id: string;
  period_start: string;
  period_end: string;
  appointment_count: number;
  ot_count: number;
  consultation_earnings: number;
  ot_earnings: number;
  total_earnings: number;
  payment_status: 'pending' | 'paid' | 'processing';
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  doctor: {
    id: string;
    first_name: string;
    last_name: string;
    consultation_fee: number;
  };
}

export function DoctorPayments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});

  // Fetch doctor payments
  const { data: doctorPayments, isLoading } = useQuery({
    queryKey: ['doctor-payments', selectedMonth],
    queryFn: async () => {
      const startDate = startOfMonth(selectedMonth).toISOString().split('T')[0];
      const endDate = endOfMonth(selectedMonth).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('doctor_payments')
        .select(`
          *,
          doctor:doctors!doctor_payments_doctor_id_fkey (
            id,
            consultation_fee,
            profiles!doctors_id_fkey (
              first_name,
              last_name
            )
          )
        `)
        .gte('period_start', startDate)
        .lte('period_end', endDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to flatten the nested structure
      return data?.map(payment => ({
        ...payment,
        doctor: {
          id: payment.doctor.id,
          first_name: payment.doctor.profiles.first_name,
          last_name: payment.doctor.profiles.last_name,
          consultation_fee: payment.doctor.consultation_fee
        }
      })) as DoctorPayment[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000
  });

  // Generate payments for current month
  const generatePaymentsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('generate_doctor_payments', {
          target_month: selectedMonth.toISOString().split('T')[0]
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast({
        title: "Payments Generated",
        description: `Generated ${count} doctor payment records for ${format(selectedMonth, 'MMMM yyyy')}`,
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-payments'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mark payment as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes?: string }) => {
      const { error } = await supabase
        .from('doctor_payments')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: profile?.id,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Payment Marked as Paid",
        description: "The doctor payment has been successfully marked as paid.",
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-payments'] });
      setPaymentNotes({});
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleMarkAsPaid = (paymentId: string) => {
    const notes = paymentNotes[paymentId];
    markAsPaidMutation.mutate({ paymentId, notes });
  };

  const totalPendingAmount = doctorPayments?.filter(p => p.payment_status === 'pending')
    .reduce((sum, payment) => sum + payment.total_earnings, 0) || 0;

  const totalPaidAmount = doctorPayments?.filter(p => p.payment_status === 'paid')
    .reduce((sum, payment) => sum + payment.total_earnings, 0) || 0;

  const pendingCount = doctorPayments?.filter(p => p.payment_status === 'pending').length || 0;
  const paidCount = doctorPayments?.filter(p => p.payment_status === 'paid').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Doctor Payments Management</CardTitle>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-auto justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedMonth, "MMMM yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedMonth}
                    onSelect={(date) => date && setSelectedMonth(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button 
                onClick={() => generatePaymentsMutation.mutate()}
                disabled={generatePaymentsMutation.isPending}
              >
                {generatePaymentsMutation.isPending ? "Generating..." : "Generate Payments"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatPkrAmount(totalPendingAmount)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {pendingCount} doctors waiting for payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPkrAmount(totalPaidAmount)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {paidCount} payments completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Doctors</p>
                <p className="text-2xl font-bold text-blue-600">
                  {doctorPayments?.length || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active in {format(selectedMonth, "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPkrAmount(totalPendingAmount + totalPaidAmount)}
                </p>
              </div>
              <Banknote className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Complete month earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Payment Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>OT Operations</TableHead>
                  <TableHead>Consultation Earnings</TableHead>
                  <TableHead>OT Earnings</TableHead>
                  <TableHead>Total Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctorPayments?.length ? (
                  doctorPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        Dr. {payment.doctor.first_name} {payment.doctor.last_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.period_start), 'MMM d')} - {format(new Date(payment.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ClipboardList className="w-4 h-4 text-blue-500" />
                          {payment.appointment_count}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-purple-500" />
                          {payment.ot_count}
                        </div>
                      </TableCell>
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
                        <Badge
                          className={cn(
                            payment.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                            payment.payment_status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          )}
                        >
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.payment_status === 'pending' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                Mark as Paid
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Mark Payment as Paid</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Payment Details for Dr. {payment.doctor.first_name} {payment.doctor.last_name}
                                  </p>
                                  <p className="font-medium">Amount: {formatPkrAmount(payment.total_earnings)}</p>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Payment Notes (Optional)</label>
                                  <Textarea
                                    placeholder="Add any notes about this payment..."
                                    value={paymentNotes[payment.id] || ''}
                                    onChange={(e) => setPaymentNotes(prev => ({
                                      ...prev,
                                      [payment.id]: e.target.value
                                    }))}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={() => handleMarkAsPaid(payment.id)}
                                    disabled={markAsPaidMutation.isPending}
                                    className="flex-1"
                                  >
                                    {markAsPaidMutation.isPending ? "Processing..." : "Confirm Payment"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {payment.payment_status === 'paid' && payment.paid_at && (
                          <div className="text-xs text-muted-foreground">
                            Paid on {format(new Date(payment.paid_at), 'MMM d, yyyy')}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No doctor payments found for {format(selectedMonth, 'MMMM yyyy')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}