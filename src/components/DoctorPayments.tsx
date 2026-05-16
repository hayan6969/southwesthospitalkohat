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
import { CalendarIcon, Banknote, Users, ClipboardList, CheckCircle, Clock, AlertCircle, Building2, Loader2, BedDouble, Stethoscope, Syringe } from "lucide-react";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  hospital_share: number;
  doctor_share: number;
  hospital_share_percentage: number;
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

interface IpdDoctorPayment {
  id: string;
  doctor_id: string;
  admission_id: string;
  charge_type: string;
  amount: number;
  status: string;
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
  doctor_name?: string;
}

export function DoctorPayments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [paymentNotes, setPaymentNotes] = useState<Record<string, string>>({});
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedIpdPaymentId, setSelectedIpdPaymentId] = useState<string | null>(null);
  const [ipdPaymentDialogOpen, setIpdPaymentDialogOpen] = useState(false);

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(selectedDate.getDate()).padStart(2, '0');
  const targetDate = `${year}-${month}-${day}`;

  const { data: doctorPayments, isLoading } = useQuery({
    queryKey: ['doctor-payments', selectedDate],
    queryFn: async () => {
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
        .eq('period_start', targetDate)
        .eq('period_end', targetDate)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(payment => ({
        ...payment,
        doctor: {
          id: (payment.doctor as any).id,
          first_name: (payment.doctor as any).profiles?.first_name,
          last_name: (payment.doctor as any).profiles?.last_name,
          consultation_fee: (payment.doctor as any).consultation_fee
        }
      })) as DoctorPayment[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000
  });

  // Fetch IPD doctor payments for the selected date
  const { data: ipdPayments, isLoading: ipdLoading } = useQuery({
    queryKey: ['ipd-doctor-payments-list', targetDate],
    queryFn: async () => {
      const startOfDay = `${targetDate}T00:00:00`;
      const endOfDay = `${targetDate}T23:59:59`;

      const { data, error } = await supabase
        .from('ipd_doctor_payments')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch doctor names from profiles directly
      const doctorIds = [...new Set(data?.map(p => p.doctor_id) || [])];
      let doctorMap: Record<string, string> = {};
      if (doctorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', doctorIds);
        if (profiles) {
          profiles.forEach(p => {
            doctorMap[p.id] = `Dr. ${p.first_name} ${p.last_name}`;
          });
        }
      }

      return (data || []).map(p => ({
        ...p,
        doctor_name: doctorMap[p.doctor_id] || '\u2014',
      })) as IpdDoctorPayment[];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  // Fetch IPD invoices finalized on this date for earnings display
  const { data: ipdInvoices } = useQuery({
    queryKey: ['ipd-invoices-date', targetDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ipd_invoices')
        .select('doctor_charges_total, anesthesia_charges_total, ota_charges_total, ot_charges_total, ipd_admissions(doctor_id)')
        .not('finalized_at', 'is', null)
        .gte('finalized_at', `${targetDate}T00:00:00`)
        .lte('finalized_at', `${targetDate}T23:59:59`);

      if (error) throw error;

      // Aggregate by doctor
      const byDoctor: Record<string, { doctorFees: number; anesthesiaFees: number; otaCharges: number; otCharges: number; count: number }> = {};
      (data || []).forEach((inv: any) => {
        const doctorId = inv.ipd_admissions?.doctor_id;
        if (!doctorId) return;
        if (!byDoctor[doctorId]) {
          byDoctor[doctorId] = { doctorFees: 0, anesthesiaFees: 0, otaCharges: 0, otCharges: 0, count: 0 };
        }
        byDoctor[doctorId].doctorFees += Number(inv.doctor_charges_total) || 0;
        byDoctor[doctorId].anesthesiaFees += Number(inv.anesthesia_charges_total) || 0;
        byDoctor[doctorId].otaCharges += Number(inv.ota_charges_total) || 0;
        byDoctor[doctorId].otCharges += Number(inv.ot_charges_total) || 0;
        byDoctor[doctorId].count += 1;
      });

      // Fetch doctor names from profiles directly
      const doctorIds = Object.keys(byDoctor);
      let doctorMap: Record<string, string> = {};
      if (doctorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', doctorIds);
        if (profiles) {
          profiles.forEach(p => {
            doctorMap[p.id] = `Dr. ${p.first_name} ${p.last_name}`;
          });
        }
      }

      return Object.entries(byDoctor).map(([doctorId, earnings]) => ({
        doctorId,
        doctorName: doctorMap[doctorId] || '\u2014',
        ...earnings,
        totalEarnings: earnings.doctorFees + earnings.anesthesiaFees,
      }));
    },
    enabled: !!profile?.id,
  });

  const generatePaymentsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .rpc('generate_daily_doctor_payments', {
          target_date: targetDate
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      toast({
        title: count > 0 ? "Daily Payments Updated" : "No Payments Generated",
        description: count > 0 
          ? `Generated ${count} doctor payment records for ${format(selectedDate, 'MMM d, yyyy')}`
          : `No paid invoices or OT schedules found for ${format(selectedDate, 'MMM d, yyyy')}. IPD payments appear automatically when invoices are finalized.`,
        variant: count > 0 ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-doctor-payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-invoices-date'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

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
      queryClient.invalidateQueries({ queryKey: ['financial-analytics'] });
      setPaymentNotes({});
      setSelectedPaymentId(null);
      setPaymentDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation to mark IPD payment as paid
  const markIpdAsPaidMutation = useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes?: string }) => {
      const { error } = await supabase
        .from('ipd_doctor_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: profile?.id,
          notes: notes || null,
        })
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "IPD Payment Marked as Paid",
        description: "The IPD doctor payment has been successfully marked as paid.",
      });
      queryClient.invalidateQueries({ queryKey: ['ipd-doctor-payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-invoices-date'] });
      setPaymentNotes({});
      setSelectedIpdPaymentId(null);
      setIpdPaymentDialogOpen(false);
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

  const handleMarkIpdAsPaid = (paymentId: string) => {
    const notes = paymentNotes[`ipd-${paymentId}`];
    markIpdAsPaidMutation.mutate({ paymentId, notes });
  };

  const totalPendingAmount = doctorPayments?.filter(p => p.payment_status === 'pending')
    .reduce((sum, payment) => sum + payment.total_earnings, 0) || 0;

  const totalPaidAmount = doctorPayments?.filter(p => p.payment_status === 'paid')
    .reduce((sum, payment) => sum + payment.total_earnings, 0) || 0;

  const pendingCount = doctorPayments?.filter(p => p.payment_status === 'pending').length || 0;
  const paidCount = doctorPayments?.filter(p => p.payment_status === 'paid').length || 0;
  const totalHospitalShare = doctorPayments?.reduce((sum, p) => sum + Number(p.hospital_share || 0), 0) || 0;

  // IPD calculations
  const ipdPendingPayments = ipdPayments?.filter(p => p.status === 'pending') || [];
  const ipdPaidPayments = ipdPayments?.filter(p => p.status === 'paid') || [];
  const ipdPendingTotal = ipdPendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const ipdPaidTotal = ipdPaidPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const ipdEarningsTotal = ipdInvoices?.reduce((sum, inv) => sum + inv.totalEarnings, 0) || 0;

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
      {/* Header with Date Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daily Doctor Payments Management</CardTitle>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-auto justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Button 
                onClick={() => generatePaymentsMutation.mutate()}
                disabled={generatePaymentsMutation.isPending}
              >
                {generatePaymentsMutation.isPending ? "Generating..." : "Generate Daily Payments"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">OPD Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatPkrAmount(totalPendingAmount)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {pendingCount} doctors waiting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">OPD Paid Today</p>
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
                <p className="text-sm font-medium text-muted-foreground">IPD Pending</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatPkrAmount(ipdPendingTotal)}
                </p>
              </div>
              <BedDouble className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {ipdPendingPayments.length} IPD payments pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">IPD Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPkrAmount(ipdPaidTotal)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {ipdPaidPayments.length} IPD payments paid
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hospital Share</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPkrAmount(totalHospitalShare)}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              From OPD consultations & OT
            </p>
          </CardContent>
        </Card>
      </div>

      {/* OPD Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>OPD Doctor Payment Details</CardTitle>
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
                  <TableHead>Hospital Share</TableHead>
                  <TableHead>Doctor Share</TableHead>
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
                        {payment.period_start === payment.period_end ? 
                          format(new Date(payment.period_start), 'PPP') :
                          `${format(new Date(payment.period_start), 'MMM d')} - ${format(new Date(payment.period_end), 'MMM d, yyyy')}`
                        }
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
                      <TableCell className="text-red-600 font-medium">
                        {formatPkrAmount(Number(payment.hospital_share || 0))}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatPkrAmount(Number(payment.doctor_share || 0))}
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
                          <Button size="sm" variant="outline" onClick={() => {
                            setSelectedPaymentId(payment.id);
                            setPaymentDialogOpen(true);
                          }}>
                            Mark as Paid
                          </Button>
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
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No OPD doctor payments found for {format(selectedDate, 'PPP')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* IPD Payments Section */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-amber-500" />
              IPD Doctor Payments
            </CardTitle>
            <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
              {formatPkrAmount(ipdEarningsTotal)} earned today
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {ipdLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              {/* IPD Earnings per Doctor */}
              {ipdInvoices && ipdInvoices.length > 0 && (
                <div className="border rounded-lg overflow-hidden mb-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-amber-50/50">
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-center">Admissions</TableHead>
                        <TableHead className="text-right">Doctor Fees</TableHead>
                        <TableHead className="text-right">Anesthesia</TableHead>
                        <TableHead className="text-right">OTA/OT</TableHead>
                        <TableHead className="text-right">Total IPD Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ipdInvoices.map(inv => (
                        <TableRow key={inv.doctorId}>
                          <TableCell className="font-medium">{inv.doctorName}</TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{inv.count}</Badge></TableCell>
                          <TableCell className="text-right">{formatPkrAmount(inv.doctorFees)}</TableCell>
                          <TableCell className="text-right">{formatPkrAmount(inv.anesthesiaFees)}</TableCell>
                          <TableCell className="text-right">{formatPkrAmount(inv.otaCharges + inv.otCharges)}</TableCell>
                          <TableCell className="text-right font-bold text-amber-700">{formatPkrAmount(inv.totalEarnings)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* IPD Payments Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Charge Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipdPayments && ipdPayments.length > 0 ? (
                      ipdPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.doctor_name}</TableCell>
                          <TableCell className="capitalize">
                            <div className="flex items-center gap-1">
                              {payment.charge_type === 'doctor' && <Stethoscope className="w-4 h-4 text-indigo-500" />}
                              {payment.charge_type === 'anesthesia' && <Syringe className="w-4 h-4 text-cyan-500" />}
                              {payment.charge_type === 'ota' && <Users className="w-4 h-4 text-amber-500" />}
                              {payment.charge_type}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatPkrAmount(Number(payment.amount))}</TableCell>
                          <TableCell>
                            <Badge
                              className={payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}
                            >
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {format(new Date(payment.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {payment.notes || '\u2014'}
                          </TableCell>
                          <TableCell>
                            {payment.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedIpdPaymentId(payment.id);
                                setIpdPaymentDialogOpen(true);
                              }}>
                                Mark as Paid
                              </Button>
                            )}
                            {payment.status === 'paid' && payment.paid_at && (
                              <div className="text-xs text-muted-foreground">
                                Paid {format(new Date(payment.paid_at), 'MMM d, HH:mm')}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No IPD doctor payments found for {format(selectedDate, 'PPP')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OPD Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={(open) => {
        setPaymentDialogOpen(open);
        if (!open) setSelectedPaymentId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark OPD Payment as Paid</DialogTitle>
          </DialogHeader>
          {selectedPaymentId && (() => {
            const payment = doctorPayments?.find(p => p.id === selectedPaymentId);
            if (!payment) return null;
            return (
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
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleMarkAsPaid(payment.id)}
                    disabled={markAsPaidMutation.isPending}
                    className="flex-1"
                  >
                    {markAsPaidMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Confirm Payment"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* IPD Payment Dialog */}
      <Dialog open={ipdPaymentDialogOpen} onOpenChange={(open) => {
        setIpdPaymentDialogOpen(open);
        if (!open) setSelectedIpdPaymentId(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark IPD Payment as Paid</DialogTitle>
          </DialogHeader>
          {selectedIpdPaymentId && (() => {
            const payment = ipdPayments?.find(p => p.id === selectedIpdPaymentId);
            if (!payment) return null;
            return (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    IPD Payment for {payment.doctor_name}
                  </p>
                  <p className="font-medium">
                    {payment.charge_type === 'doctor' ? 'Doctor Fee' : 
                     payment.charge_type === 'anesthesia' ? 'Anesthesia Fee' : 
                     payment.charge_type === 'ota' ? 'OTA Fee' : payment.charge_type}: {formatPkrAmount(Number(payment.amount))}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Payment Notes (Optional)</label>
                  <Textarea
                    placeholder="Add any notes about this payment..."
                    value={paymentNotes[`ipd-${payment.id}`] || ''}
                    onChange={(e) => setPaymentNotes(prev => ({
                      ...prev,
                      [`ipd-${payment.id}`]: e.target.value
                    }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIpdPaymentDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleMarkIpdAsPaid(payment.id)}
                    disabled={markIpdAsPaidMutation.isPending}
                    className="flex-1"
                  >
                    {markIpdAsPaidMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : "Confirm Payment"}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
