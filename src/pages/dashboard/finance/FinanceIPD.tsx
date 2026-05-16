import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPkrAmount } from "@/utils/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BedDouble, Stethoscope, Syringe, Activity, Pill, FlaskConical, Calendar, RefreshCw, Download, Receipt } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FinanceIPD() {
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const formatDateForQuery = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const { data: ipdInvoices, isLoading, refetch } = useQuery({
    queryKey: ['ipd-finance-invoices', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('ipd_invoices')
        .select(`
          *,
          ipd_admissions(
            admission_number,
            admission_date,
            discharge_date,
            status,
            doctor_id,
            wards(name),
            beds(bed_number)
          )
        `)
        .not('finalized_at', 'is', null)
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', formatDateForQuery(dateRange.from));
      }
      if (dateRange?.to) {
        query = query.lte('created_at', formatDateForQuery(dateRange.to) + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-ipd-finance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .select('id, profiles(first_name, last_name)');
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

  const totals = ipdInvoices?.reduce((acc, inv) => ({
    bed: acc.bed + (Number(inv.bed_charges_total) || 0),
    doctor: acc.doctor + (Number(inv.doctor_charges_total) || 0),
    anesthesia: acc.anesthesia + (Number(inv.anesthesia_charges_total) || 0),
    ota: acc.ota + (Number(inv.ota_charges_total) || 0),
    ot: acc.ot + (Number(inv.ot_charges_total) || 0),
    medicine: acc.medicine + (Number(inv.medicine_charges_total) || 0),
    lab: acc.lab + (Number(inv.lab_charges_total) || 0),
    total: acc.total + (Number(inv.total_amount) || 0),
    paid: acc.paid + (Number(inv.paid_amount) || 0),
  }), { bed: 0, doctor: 0, anesthesia: 0, ota: 0, ot: 0, medicine: 0, lab: 0, total: 0, paid: 0 }) || { bed: 0, doctor: 0, anesthesia: 0, ota: 0, ot: 0, medicine: 0, lab: 0, total: 0, paid: 0 };

  const hospitalRevenue = totals.bed + totals.ota + totals.ot;
  const doctorRevenue = totals.doctor;
  const anesthesiologistRevenue = totals.anesthesia;
  const pharmacyRevenue = totals.medicine;
  const labRevenue = totals.lab;

  const handleExportCSV = () => {
    if (!ipdInvoices?.length) {
      toast.error("No data to export");
      return;
    }
    const rows = ipdInvoices.map(inv => {
      const adm = inv.ipd_admissions as any;
      const balance = (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0);
      return {
        invoice_number: inv.invoice_number,
        admission_number: adm?.admission_number,
        admission_date: adm?.admission_date,
        discharge_date: adm?.discharge_date,
        doctor: getDoctorName(adm?.doctor_id),
        bed_charges: Number(inv.bed_charges_total) || 0,
        doctor_fees: Number(inv.doctor_charges_total) || 0,
        anesthesia: Number(inv.anesthesia_charges_total) || 0,
        ota: Number(inv.ota_charges_total) || 0,
        ot: Number(inv.ot_charges_total) || 0,
        medicines: Number(inv.medicine_charges_total) || 0,
        lab: Number(inv.lab_charges_total) || 0,
        total: Number(inv.total_amount) || 0,
        paid: Number(inv.paid_amount) || 0,
        balance,
        finalized_at: inv.finalized_at,
      };
    });

    const csvContent = [
      ['Invoice', 'Admission', 'Admission Date', 'Discharge Date', 'Doctor', 'Bed', 'Doctor Fees', 'Anesthesia', 'OTA', 'OT', 'Medicines', 'Lab', 'Total', 'Paid', 'Balance', 'Finalized'].join(','),
      ...rows.map(r => [
        r.invoice_number, r.admission_number, r.admission_date, r.discharge_date,
        r.doctor, r.bed_charges, r.doctor_fees, r.anesthesia, r.ota, r.ot,
        r.medicines, r.lab, r.total, r.paid, r.balance, r.finalized_at
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipd-finance-${formatDateForQuery(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("IPD finance data exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">IPD Finance</h2>
          <p className="text-sm text-muted-foreground">In-Patient Department revenue breakdown by stakeholder</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!ipdInvoices?.length}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4 items-end">
            <div>
              <Label>From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.from ? format(dateRange.from, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={dateRange?.from} onSelect={(d) => setDateRange(prev => ({ ...prev, from: d }))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !dateRange?.to && "text-muted-foreground")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange?.to ? format(dateRange.to, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent mode="single" selected={dateRange?.to} onSelect={(d) => setDateRange(prev => ({ ...prev, to: d }))} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Total IPD</p>
            <p className="text-lg font-bold text-amber-700 mt-1">{formatPkrAmount(totals.total)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Bed Charges</p>
            <p className="text-lg font-bold text-blue-700 mt-1">{formatPkrAmount(totals.bed)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Doctor Fees</p>
            <p className="text-lg font-bold text-indigo-700 mt-1">{formatPkrAmount(totals.doctor)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Anesthesia</p>
            <p className="text-lg font-bold text-cyan-700 mt-1">{formatPkrAmount(totals.anesthesia)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 border-purple-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Medicines</p>
            <p className="text-lg font-bold text-purple-700 mt-1">{formatPkrAmount(totals.medicine)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Lab Tests</p>
            <p className="text-lg font-bold text-teal-700 mt-1">{formatPkrAmount(totals.lab)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Revenue by Stakeholder</CardTitle>
          <CardDescription>How IPD revenue is distributed</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-amber-50/50">
                <TableHead>Stakeholder</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="flex items-center gap-2"><BedDouble className="w-4 h-4 text-blue-500" />Hospital (Bed + OTA + OT)</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(hospitalRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((hospitalRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-indigo-500" />Doctor Fees</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(doctorRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((doctorRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Syringe className="w-4 h-4 text-cyan-500" />Anesthesiologist</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(anesthesiologistRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((anesthesiologistRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><Pill className="w-4 h-4 text-purple-500" />Pharmacy (IPD Medicines)</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(pharmacyRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((pharmacyRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="flex items-center gap-2"><FlaskConical className="w-4 h-4 text-teal-500" />Lab (IPD Tests)</TableCell>
                <TableCell className="text-right font-medium">{formatPkrAmount(labRevenue)}</TableCell>
                <TableCell className="text-right">{totals.total > 0 ? ((labRevenue / totals.total) * 100).toFixed(1) : 0}%</TableCell>
              </TableRow>
            </TableBody>
            <TableFooter>
              <TableRow className="bg-amber-50/80">
                <TableCell className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold text-amber-700">{formatPkrAmount(totals.total)}</TableCell>
                <TableCell className="text-right font-bold">100%</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IPD Invoices</CardTitle>
          <CardDescription>{ipdInvoices?.length || 0} finalized invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}</div>
          ) : !ipdInvoices?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No finalized IPD invoices found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Bed</TableHead>
                    <TableHead className="text-right">Doctor</TableHead>
                    <TableHead className="text-right">Anesthesia</TableHead>
                    <TableHead className="text-right">OTA/OT</TableHead>
                    <TableHead className="text-right">Medicine</TableHead>
                    <TableHead className="text-right">Lab</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipdInvoices.map(inv => {
                    const adm = inv.ipd_admissions as any;
                    const balance = (Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0);
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs">{adm?.admission_number}</TableCell>
                        <TableCell className="text-xs">{getDoctorName(adm?.doctor_id)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.bed_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.doctor_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.anesthesia_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount((Number(inv.ota_charges_total) || 0) + (Number(inv.ot_charges_total) || 0))}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.medicine_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right text-xs">{formatPkrAmount(Number(inv.lab_charges_total) || 0)}</TableCell>
                        <TableCell className="text-right font-medium text-xs">{formatPkrAmount(Number(inv.total_amount) || 0)}</TableCell>
                        <TableCell className="text-right text-xs text-green-600">{formatPkrAmount(Number(inv.paid_amount) || 0)}</TableCell>
                        <TableCell className={`text-right font-medium text-xs ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatPkrAmount(balance)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={3} className="font-bold">Totals ({ipdInvoices.length} invoices)</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.bed)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.doctor)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.anesthesia)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.ota + totals.ot)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.medicine)}</TableCell>
                    <TableCell className="text-right font-medium">{formatPkrAmount(totals.lab)}</TableCell>
                    <TableCell className="text-right font-bold">{formatPkrAmount(totals.total)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatPkrAmount(totals.paid)}</TableCell>
                    <TableCell className={`text-right font-bold ${totals.total - totals.paid > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatPkrAmount(totals.total - totals.paid)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
