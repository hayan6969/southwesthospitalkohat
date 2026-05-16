import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, Banknote, Calendar, RefreshCw, Download, CheckCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function FinanceIPDDoctorPayments() {
  const queryClient = useQueryClient();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentDateRange, setPaymentDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const { data: ipdInvoices, isLoading } = useQuery({
    queryKey: ['ipd-doctor-payment-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ipd_invoices')
        .select(`
          *,
          ipd_admissions(
            admission_number,
            admission_date,
            discharge_date,
            status,
            doctor_id
          )
        `)
        .not('finalized_at', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-ipd-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, profiles(first_name, last_name, email)');
      if (error) throw error;
      return data;
    },
  });

  const { data: doctorPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['ipd-doctor-payments', paymentDateRange],
    queryFn: async () => {
      let query = supabase
        .from('ipd_doctor_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentDateRange?.from) {
        query = query.gte('created_at', paymentDateRange.from.toISOString());
      }
      if (paymentDateRange?.to) {
        query = query.lte('created_at', paymentDateRange.to.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId) return '\u2014';
    const doc = doctors?.find(d => d.id === doctorId);
    const profile = doc?.profiles as any;
    return profile ? `Dr. ${profile.first_name} ${profile.last_name}` : '\u2014';
  };

  const filteredPayments = doctorPayments?.filter(p => {
    if (statusFilter === "pending") return p.status === "pending";
    if (statusFilter === "paid") return p.status === "paid";
    return true;
  }) || [];

  const perDoctorEarnings = doctors?.map(doctor => {
    const profile = doctor.profiles as any;
    const doctorName = profile ? `Dr. ${profile.first_name} ${profile.last_name}` : 'Unknown';

    const doctorInvoices = ipdInvoices?.filter(inv => (inv.ipd_admissions as any)?.doctor_id === doctor.id) || [];
    const doctorFees = doctorInvoices.reduce((sum, inv) => sum + (Number(inv.doctor_charges_total) || 0), 0);
    const anesthesiaFees = doctorInvoices.reduce((sum, inv) => sum + (Number(inv.anesthesia_charges_total) || 0), 0);
    const totalEarned = doctorFees + anesthesiaFees;

    const payments = doctorPayments?.filter(p => p.doctor_id === doctor.id) || [];
    const paidPayments = payments.filter(p => p.status === "paid");
    const totalPaid = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return {
      id: doctor.id,
      name: doctorName,
      email: profile?.email,
      doctorFees,
      anesthesiaFees,
      totalEarned,
      totalPaid,
      balance: totalEarned - totalPaid,
      invoiceCount: doctorInvoices.length,
      paymentCount: paidPayments.length,
    };
  })?.filter(d => d.totalEarned > 0 || d.totalPaid > 0)
    .sort((a, b) => b.balance - a.balance) || [];

  const createPaymentMutation = useMutation({
    mutationFn: async ({ doctorId, amount, notes }: { doctorId: string; amount: number; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('ipd_doctor_payments')
        .insert({
          doctor_id: doctorId,
          amount,
          notes,
          status: "paid",
          paid_at: new Date().toISOString(),
          paid_by: user?.id,
          charge_type: 'aggregate',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ['ipd-doctor-payments'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-doctor-payment-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['ipd-invoices-revenue'] });
      queryClient.invalidateQueries({ queryKey: ['doctors-ipd-payments'] });
      setShowPaymentDialog(false);
      setPaymentAmount(0);
      setPaymentNotes("");
      setSelectedDoctor(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });

  const handleExportCSV = () => {
    if (!perDoctorEarnings.length) {
      toast.error("No data to export");
      return;
    }
    const csvContent = [
      ['Doctor', 'Doctor Fees', 'Anesthesia Fees', 'Total Earned', 'Total Paid', 'Balance', 'Invoices', 'Payments'].join(','),
      ...perDoctorEarnings.map(d => [
        d.name, d.doctorFees, d.anesthesiaFees, d.totalEarned, d.totalPaid, d.balance, d.invoiceCount, d.paymentCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipd-doctor-payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Doctor payments exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">IPD Doctor Payments</h2>
          <p className="text-sm text-muted-foreground">Track and manage doctor payments from IPD admissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!perDoctorEarnings.length}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">Doctor Earnings</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Earnings & Payment Status</CardTitle>
              <CardDescription>IPD doctor fees and anesthesia fees vs payments made</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading || paymentsLoading ? (
                <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}</div>
              ) : !perDoctorEarnings.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Stethoscope className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No doctor earnings recorded yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-indigo-50/50">
                        <TableHead>Doctor</TableHead>
                        <TableHead className="text-right">Doctor Fees</TableHead>
                        <TableHead className="text-right">Anesthesia</TableHead>
                        <TableHead className="text-right">Total Earned</TableHead>
                        <TableHead className="text-right">Total Paid</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead className="text-center">Admissions</TableHead>
                        <TableHead className="text-center">Payments</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perDoctorEarnings.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.name}</TableCell>
                          <TableCell className="text-right">{formatPkrAmount(doc.doctorFees)}</TableCell>
                          <TableCell className="text-right">{formatPkrAmount(doc.anesthesiaFees)}</TableCell>
                          <TableCell className="text-right font-medium">{formatPkrAmount(doc.totalEarned)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatPkrAmount(doc.totalPaid)}</TableCell>
                          <TableCell className={`text-right font-bold ${doc.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatPkrAmount(doc.balance)}
                          </TableCell>
                          <TableCell className="text-center"><Badge variant="secondary">{doc.invoiceCount}</Badge></TableCell>
                          <TableCell className="text-center"><Badge variant="outline">{doc.paymentCount}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedDoctor(doc);
                                setPaymentAmount(Math.max(0, doc.balance));
                                setShowPaymentDialog(true);
                              }}
                              disabled={doc.balance <= 0}
                            >
                              <Banknote className="w-4 h-4 mr-1" /> Pay
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-indigo-50/80">
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.doctorFees, 0))}</TableCell>
                        <TableCell className="text-right font-bold">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.anesthesiaFees, 0))}</TableCell>
                        <TableCell className="text-right font-bold">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.totalEarned, 0))}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.totalPaid, 0))}</TableCell>
                        <TableCell className={`text-right font-bold ${perDoctorEarnings.reduce((s, d) => s + d.balance, 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPkrAmount(perDoctorEarnings.reduce((s, d) => s + d.balance, 0))}
                        </TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>All IPD doctor payments made</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}</div>
              ) : !filteredPayments.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Banknote className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Charge Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{getDoctorName(p.doctor_id)}</TableCell>
                          <TableCell className="capitalize">{p.charge_type}</TableCell>
                          <TableCell className="text-right">{formatPkrAmount(Number(p.amount) || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "paid" ? "default" : "secondary"}>
                              {p.status === "paid" ? "Paid" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{p.paid_at ? format(new Date(p.paid_at), 'MMM d, yyyy') : '\u2014'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.notes || '\u2014'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={2} className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">{formatPkrAmount(filteredPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0))}</TableCell>
                        <TableCell colSpan={3}></TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              Record Payment — {selectedDoctor?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted rounded-md p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Total Earned</span><span className="font-medium">{formatPkrAmount(selectedDoctor?.totalEarned || 0)}</span></div>
              <div className="flex justify-between"><span>Already Paid</span><span className="text-green-600">{formatPkrAmount(selectedDoctor?.totalPaid || 0)}</span></div>
              <div className="flex justify-between font-bold"><span>Balance Due</span><span className={selectedDoctor?.balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatPkrAmount(selectedDoctor?.balance || 0)}</span></div>
            </div>
            <div>
              <Label>Payment Amount</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional payment notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createPaymentMutation.mutate({ doctorId: selectedDoctor.id, amount: paymentAmount, notes: paymentNotes })}
              disabled={paymentAmount <= 0 || createPaymentMutation.isPending}
            >
              {createPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle className="w-4 h-4 mr-1" /> Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
