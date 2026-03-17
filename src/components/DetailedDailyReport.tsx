import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatPkrAmount } from "@/utils/currency";
import { formatInPakistanTime } from "@/utils/timezone";
import { Receipt, TrendingDown, AlertTriangle, FlaskConical, Scan, Syringe, Stethoscope, Activity, Pill, Users, Image as ImageIcon } from "lucide-react";

interface TransactionItem {
  id: string;
  patientName: string;
  time: string;
  procedureName: string;
  consultant: string;
  amountPaid: number;
  docShare: number;
  hosShare: number;
  operator: string;
  category: string;
  shift: 'Night' | 'Morning' | 'Evening';
}

interface ExpenseItem {
  id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  time: string;
}

interface RefundItem {
  id: string;
  description: string;
  refundType: string;
  amount: number;
  date: string;
  time: string;
}

interface DetailedReportProps {
  hospitalInvoices: any[];
  labReports: any[];
  xrayReports: any[];
  otSchedules: any[];
  emergencyAppointments: any[];
  expenses: any[];
  refunds: any[];
  miscellaneousIncome: any[];
  staffProfiles: any[];
  reportDate: string;
}

// Determine shift based on hour (Pakistan time)
function getShift(dateStr: string): 'Night' | 'Morning' | 'Evening' {
  const hour = new Date(dateStr).getHours();
  // Adjust for Pakistan time (+5 hours)
  const pkHour = (hour + 5) % 24;
  if (pkHour >= 0 && pkHour < 8) return 'Night';
  if (pkHour >= 8 && pkHour < 14) return 'Morning';
  return 'Evening';
}

function getShiftOrder(shift: string): number {
  if (shift === 'Night') return 0;
  if (shift === 'Morning') return 1;
  return 2;
}

function getOperatorName(createdBy: string | null, staffProfiles: any[]): string {
  if (!createdBy) return '—';
  const staff = staffProfiles?.find(s => s.id === createdBy);
  return staff ? `${staff.first_name} ${staff.last_name}` : '—';
}

const categoryConfig: Record<string, { icon: any; color: string; label: string }> = {
  'OPD': { icon: Stethoscope, color: 'text-indigo-600', label: 'OPD Consultations' },
  'Emergency': { icon: AlertTriangle, color: 'text-amber-600', label: 'Emergency Services' },
  'Lab': { icon: FlaskConical, color: 'text-teal-600', label: 'Lab Services' },
  'X-Ray': { icon: Scan, color: 'text-cyan-600', label: 'X-Ray Services' },
  'OT': { icon: Syringe, color: 'text-rose-600', label: 'OT / Surgery' },
  'Miscellaneous': { icon: Activity, color: 'text-green-600', label: 'Miscellaneous Income' },
};

export function DetailedDailyReport({
  hospitalInvoices,
  labReports,
  xrayReports,
  otSchedules,
  emergencyAppointments,
  expenses,
  refunds,
  miscellaneousIncome,
  staffProfiles,
  reportDate,
}: DetailedReportProps) {
  // Build transaction items from all sources
  const transactions: TransactionItem[] = [];

  // OPD Consultations (non-emergency hospital invoices with INV- prefix)
  const isEmergencyInvoice = (inv: any) =>
    inv.description?.toLowerCase().includes('emergency') ||
    Boolean(inv.emergency_patient_data) ||
    inv.invoice_number?.startsWith('EMG-') ||
    inv.invoice_number?.startsWith('EMERGENCY-');

  const opdInvoices = (hospitalInvoices || []).filter((inv: any) =>
    inv.invoice_number?.startsWith('INV-') && !isEmergencyInvoice(inv)
  );

  opdInvoices.forEach((inv: any) => {
    const patientProfile = inv.patients?.profiles;
    const patientName = patientProfile
      ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
      : 'Unknown Patient';
    transactions.push({
      id: inv.id,
      patientName,
      time: inv.created_at,
      procedureName: inv.description || 'OPD Consultancy',
      consultant: '—', // Doctor name not easily available on invoice
      amountPaid: Number(inv.amount) || 0,
      docShare: Number(inv.amount) || 0, // Consultation fees go to doctor
      hosShare: 0,
      operator: getOperatorName(inv.created_by, staffProfiles),
      category: 'OPD',
      shift: getShift(inv.created_at),
    });
  });

  // Emergency invoices
  const emergencyInvs = (hospitalInvoices || []).filter(isEmergencyInvoice);
  emergencyInvs.forEach((inv: any) => {
    const patientProfile = inv.patients?.profiles;
    const patientName = patientProfile
      ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
      : (inv.emergency_patient_data as any)?.name || 'Unknown';
    transactions.push({
      id: inv.id,
      patientName,
      time: inv.created_at,
      procedureName: inv.description || 'Emergency Consultation',
      consultant: '—',
      amountPaid: Number(inv.amount) || 0,
      docShare: 0,
      hosShare: Number(inv.amount) || 0,
      operator: getOperatorName(inv.created_by, staffProfiles),
      category: 'Emergency',
      shift: getShift(inv.created_at),
    });
  });

  // Emergency appointments
  (emergencyAppointments || []).forEach((apt: any) => {
    const patientProfile = apt.patients?.profiles;
    const patientName = patientProfile
      ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
      : 'Unknown Patient';
    const doctorProfile = apt.doctors?.profiles;
    const doctorName = doctorProfile
      ? `Dr. ${doctorProfile.first_name || ''} ${doctorProfile.last_name || ''}`.trim()
      : '—';
    transactions.push({
      id: apt.id,
      patientName,
      time: apt.appointment_date,
      procedureName: 'Emergency Consultation',
      consultant: doctorName,
      amountPaid: Number(apt.consultation_fee_at_time) || 0,
      docShare: 0,
      hosShare: Number(apt.consultation_fee_at_time) || 0,
      operator: '—',
      category: 'Emergency',
      shift: getShift(apt.appointment_date),
    });
  });

  // Lab reports
  (labReports || []).forEach((lab: any) => {
    const patientProfile = lab.patients?.profiles;
    const patientName = patientProfile
      ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
      : 'Unknown Patient';
    transactions.push({
      id: lab.id,
      patientName,
      time: lab.created_at || lab.test_date,
      procedureName: lab.test_name || 'Lab Test',
      consultant: '—',
      amountPaid: Number(lab.price) || 0,
      docShare: 0,
      hosShare: Number(lab.price) || 0,
      operator: '—',
      category: 'Lab',
      shift: getShift(lab.created_at || lab.test_date),
    });
  });

  // X-ray reports
  (xrayReports || []).forEach((xray: any) => {
    const patientProfile = (xray as any).patients?.profiles;
    const patientName = patientProfile
      ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
      : 'Unknown Patient';
    transactions.push({
      id: xray.id,
      patientName,
      time: xray.created_at,
      procedureName: xray.test_name || 'X-Ray',
      consultant: '—',
      amountPaid: Number(xray.price) || 0,
      docShare: 0,
      hosShare: Number(xray.price) || 0,
      operator: '—',
      category: 'X-Ray',
      shift: getShift(xray.created_at),
    });
  });

  // OT schedules
  (otSchedules || []).forEach((ot: any) => {
    const patientProfile = ot.patients?.profiles;
    const patientName = patientProfile
      ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim()
      : 'Unknown Patient';
    const operationName = ot.ot_operations?.operation_name || 'Surgery';
    transactions.push({
      id: ot.id,
      patientName,
      time: ot.created_at,
      procedureName: operationName,
      consultant: ot.doctor_name || '—',
      amountPaid: Number(ot.total_cost) || 0,
      docShare: Number(ot.doctor_expense) || 0,
      hosShare: (Number(ot.total_cost) || 0) - (Number(ot.doctor_expense) || 0),
      operator: '—',
      category: 'OT',
      shift: getShift(ot.created_at),
    });
  });

  // Miscellaneous income
  (miscellaneousIncome || []).forEach((misc: any) => {
    transactions.push({
      id: misc.id,
      patientName: '—',
      time: misc.created_at,
      procedureName: misc.description || 'Miscellaneous',
      consultant: '—',
      amountPaid: Number(misc.amount) || 0,
      docShare: 0,
      hosShare: Number(misc.amount) || 0,
      operator: getOperatorName(misc.created_by, staffProfiles),
      category: 'Miscellaneous',
      shift: getShift(misc.created_at),
    });
  });

  // Group by category, then by shift
  const categories = ['OPD', 'Emergency', 'Lab', 'X-Ray', 'OT', 'Miscellaneous'];
  const groupedData: Record<string, Record<string, TransactionItem[]>> = {};

  categories.forEach(cat => {
    const catItems = transactions.filter(t => t.category === cat);
    if (catItems.length > 0) {
      groupedData[cat] = {};
      const shifts = ['Night', 'Morning', 'Evening'];
      shifts.forEach(shift => {
        const shiftItems = catItems.filter(t => t.shift === shift);
        if (shiftItems.length > 0) {
          groupedData[cat][shift] = shiftItems.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        }
      });
    }
  });

  // Grand totals
  const grandTotal = transactions.reduce((sum, t) => sum + t.amountPaid, 0);
  const grandDocShare = transactions.reduce((sum, t) => sum + t.docShare, 0);
  const grandHosShare = transactions.reduce((sum, t) => sum + t.hosShare, 0);

  // Build expense items
  const expenseItems: ExpenseItem[] = (expenses || []).map((exp: any) => ({
    id: exp.id,
    description: exp.description,
    category: exp.category,
    amount: exp.amount,
    date: exp.expense_date,
    time: exp.created_at,
  }));

  const totalExpenses = expenseItems.reduce((sum, e) => sum + e.amount, 0);

  // Build refund items
  const refundItems: RefundItem[] = (refunds || []).map((ref: any) => ({
    id: ref.id,
    description: ref.description,
    refundType: ref.refund_type,
    amount: ref.amount,
    date: ref.created_at,
    time: ref.created_at,
  }));

  const totalRefunds = refundItems.reduce((sum, r) => sum + r.amount, 0);

  let srNo = 0;

  return (
    <div className="space-y-6">
      {/* OPD-Style Detailed Report */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Detailed Transaction Report — {reportDate}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Grouped by service category and shift (Night: 12am–8am, Morning: 8am–2pm, Evening: 2pm–12am)
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow className="bg-muted/70">
                  <TableHead className="w-[50px] font-bold text-center">Sr #</TableHead>
                  <TableHead className="font-bold">Patient Name</TableHead>
                  <TableHead className="font-bold">Time</TableHead>
                  <TableHead className="font-bold">Procedure / Service</TableHead>
                  <TableHead className="font-bold">Consultant</TableHead>
                  <TableHead className="font-bold text-right">Amount Paid</TableHead>
                  <TableHead className="font-bold text-right">Doc. Share</TableHead>
                  <TableHead className="font-bold text-right">Hos. Share</TableHead>
                  <TableHead className="font-bold">Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(groupedData).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No transactions found for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.entries(groupedData).map(([category, shifts]) => {
                    const config = categoryConfig[category] || { icon: Activity, color: 'text-foreground', label: category };
                    const Icon = config.icon;
                    const catTotal = Object.values(shifts).flat().reduce((s, t) => s + t.amountPaid, 0);
                    const catDocShare = Object.values(shifts).flat().reduce((s, t) => s + t.docShare, 0);
                    const catHosShare = Object.values(shifts).flat().reduce((s, t) => s + t.hosShare, 0);

                    return (
                      <> 
                        {/* Category Header */}
                        <TableRow key={`cat-${category}`} className="bg-primary/5 border-t-2 border-primary/20">
                          <TableCell colSpan={9} className="py-2">
                            <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wide">
                              <Icon className={`w-4 h-4 ${config.color}`} />
                              <span className={config.color}>{config.label}</span>
                            </div>
                          </TableCell>
                        </TableRow>

                        {Object.entries(shifts).map(([shift, items]) => {
                          const shiftTotal = items.reduce((s, t) => s + t.amountPaid, 0);
                          const shiftDoc = items.reduce((s, t) => s + t.docShare, 0);
                          const shiftHos = items.reduce((s, t) => s + t.hosShare, 0);

                          return (
                            <>
                              {/* Shift Header */}
                              <TableRow key={`shift-${category}-${shift}`} className="bg-muted/30">
                                <TableCell colSpan={9} className="py-1.5">
                                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-4">
                                    {shift}
                                  </span>
                                </TableCell>
                              </TableRow>

                              {/* Transaction Rows */}
                              {items.map((item) => {
                                srNo++;
                                return (
                                  <TableRow key={item.id} className="hover:bg-muted/20">
                                    <TableCell className="text-center text-xs font-medium">{srNo}</TableCell>
                                    <TableCell className="text-sm font-medium">{item.patientName}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                      {item.time ? formatInPakistanTime(new Date(item.time), 'h:mm a') : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm max-w-[200px] truncate">{item.procedureName}</TableCell>
                                    <TableCell className="text-sm">{item.consultant}</TableCell>
                                    <TableCell className="text-right text-sm font-medium">{formatPkrAmount(item.amountPaid)}</TableCell>
                                    <TableCell className="text-right text-sm text-indigo-600 font-medium">
                                      {item.docShare > 0 ? formatPkrAmount(item.docShare) : '—'}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-blue-600 font-medium">
                                      {item.hosShare > 0 ? formatPkrAmount(item.hosShare) : '—'}
                                    </TableCell>
                                    <TableCell className="text-xs">{item.operator}</TableCell>
                                  </TableRow>
                                );
                              })}

                              {/* Shift Sub Total */}
                              <TableRow key={`shift-total-${category}-${shift}`} className="bg-muted/20 border-b">
                                <TableCell colSpan={5} className="text-right text-xs font-semibold text-muted-foreground pr-4">
                                  {shift} / Sub Total :
                                </TableCell>
                                <TableCell className="text-right text-xs font-bold">{formatPkrAmount(shiftTotal)}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-indigo-600">{formatPkrAmount(shiftDoc)}</TableCell>
                                <TableCell className="text-right text-xs font-bold text-blue-600">{formatPkrAmount(shiftHos)}</TableCell>
                                <TableCell />
                              </TableRow>
                            </>
                          );
                        })}

                        {/* Category Sub Total */}
                        <TableRow key={`cat-total-${category}`} className="bg-primary/5 border-b-2 border-primary/10">
                          <TableCell colSpan={5} className="text-right font-bold text-sm pr-4">
                            {config.label} / Sub Total :
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm">{formatPkrAmount(catTotal)}</TableCell>
                          <TableCell className="text-right font-bold text-sm text-indigo-600">{formatPkrAmount(catDocShare)}</TableCell>
                          <TableCell className="text-right font-bold text-sm text-blue-600">{formatPkrAmount(catHosShare)}</TableCell>
                          <TableCell />
                        </TableRow>
                      </>
                    );
                  })
                )}
              </TableBody>
              {transactions.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-foreground/5 border-t-2">
                    <TableCell colSpan={5} className="text-right font-bold text-base pr-4">Grand Total :</TableCell>
                    <TableCell className="text-right font-bold text-base">{formatPkrAmount(grandTotal)}</TableCell>
                    <TableCell className="text-right font-bold text-base text-indigo-700">{formatPkrAmount(grandDocShare)}</TableCell>
                    <TableCell className="text-right font-bold text-base text-blue-700">{formatPkrAmount(grandHosShare)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ========== EXPENSES DETAIL ========== */}
      <Card className="border-l-4 border-l-orange-400">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-orange-600" />
            Expenses ({expenseItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expenseItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No expenses recorded for this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-orange-50/50">
                  <TableHead className="w-[50px] font-semibold text-center">Sr #</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Description / Bill</TableHead>
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseItems.map((exp, idx) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{exp.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{exp.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {exp.time ? formatInPakistanTime(new Date(exp.time), 'MMM d, h:mm a') : exp.date}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">{formatPkrAmount(exp.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-orange-50/80">
                  <TableCell colSpan={4} className="text-right font-bold">Total Expenses :</TableCell>
                  <TableCell className="text-right font-bold text-red-700">{formatPkrAmount(totalExpenses)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========== REFUNDS DETAIL ========== */}
      <Card className="border-l-4 border-l-red-400">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            Refunds & Returns ({refundItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {refundItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No refunds recorded for this period</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-red-50/50">
                  <TableHead className="w-[50px] font-semibold text-center">Sr #</TableHead>
                  <TableHead className="font-semibold">Refund Type</TableHead>
                  <TableHead className="font-semibold">Description / Bill Reference</TableHead>
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundItems.map((ref, idx) => (
                  <TableRow key={ref.id}>
                    <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <Badge variant="destructive" className="text-xs">{ref.refundType.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ref.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {ref.time ? formatInPakistanTime(new Date(ref.time), 'MMM d, h:mm a') : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">{formatPkrAmount(ref.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="bg-red-50/80">
                  <TableCell colSpan={4} className="text-right font-bold">Total Refunds :</TableCell>
                  <TableCell className="text-right font-bold text-red-700">{formatPkrAmount(totalRefunds)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========== STAFF COLLECTION SUMMARY ========== */}
      {(() => {
        // Aggregate revenue by staff (operator)
        const staffMap: Record<string, { name: string; count: number; total: number }> = {};
        transactions.forEach(t => {
          if (t.operator && t.operator !== '—') {
            if (!staffMap[t.operator]) staffMap[t.operator] = { name: t.operator, count: 0, total: 0 };
            staffMap[t.operator].count += 1;
            staffMap[t.operator].total += t.amountPaid;
          }
        });
        const staffEntries = Object.values(staffMap).sort((a, b) => b.total - a.total);
        if (staffEntries.length === 0) return null;
        const staffGrandTotal = staffEntries.reduce((s, e) => s + e.total, 0);
        return (
          <Card className="border-l-4 border-l-emerald-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Staff Collection Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-50/50">
                    <TableHead className="w-[50px] font-semibold text-center">Sr #</TableHead>
                    <TableHead className="font-semibold">Staff Name</TableHead>
                    <TableHead className="font-semibold text-center">Transactions</TableHead>
                    <TableHead className="font-semibold text-right">Total Collected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffEntries.map((entry, idx) => (
                    <TableRow key={entry.name}>
                      <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{entry.name}</TableCell>
                      <TableCell className="text-center text-sm">{entry.count}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">{formatPkrAmount(entry.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-emerald-50/80">
                    <TableCell colSpan={3} className="text-right font-bold">Total Staff Collection :</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">{formatPkrAmount(staffGrandTotal)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        );
      })()}

      {/* ========== EXPENSE PROOFS ========== */}
      {(() => {
        const proofsExpenses = (expenses || []).filter((e: any) => e.proof_url);
        const proofsRefunds = (refunds || []).filter((r: any) => r.proof_url);
        if (proofsExpenses.length === 0 && proofsRefunds.length === 0) return null;
        return (
          <Card className="border-l-4 border-l-violet-400">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-violet-600" />
                Attached Receipts & Proofs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {proofsExpenses.map((exp: any) => (
                  <a key={exp.id} href={exp.proof_url} target="_blank" rel="noopener noreferrer" className="group">
                    <div className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                      <img src={exp.proof_url} alt={exp.description} className="w-full h-32 object-cover" />
                      <div className="p-2 text-xs">
                        <p className="font-medium truncate">Expense: {exp.description}</p>
                        <p className="text-muted-foreground">{formatPkrAmount(exp.amount)}</p>
                      </div>
                    </div>
                  </a>
                ))}
                {proofsRefunds.map((ref: any) => (
                  <a key={ref.id} href={ref.proof_url} target="_blank" rel="noopener noreferrer" className="group">
                    <div className="border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                      <img src={ref.proof_url} alt={ref.description} className="w-full h-32 object-cover" />
                      <div className="p-2 text-xs">
                        <p className="font-medium truncate">Refund: {ref.description}</p>
                        <p className="text-muted-foreground">{formatPkrAmount(ref.amount)}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ========== NET SUMMARY ========== */}
      <Card className="border-2 border-foreground/10">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hos. Share</p>
              <p className="text-lg font-bold text-blue-700 mt-1">{formatPkrAmount(grandHosShare)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Doc. Share</p>
              <p className="text-lg font-bold text-indigo-700 mt-1">{formatPkrAmount(grandDocShare)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Expenses</p>
              <p className="text-lg font-bold text-orange-700 mt-1">-{formatPkrAmount(totalExpenses)}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Refunds</p>
              <p className="text-lg font-bold text-red-700 mt-1">-{formatPkrAmount(totalRefunds)}</p>
            </div>
            <div className={`text-center p-3 rounded-lg border-2 ${(grandHosShare - totalExpenses - totalRefunds) >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hospital Net Profit</p>
              <p className={`text-lg font-bold mt-1 ${(grandHosShare - totalExpenses - totalRefunds) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatPkrAmount(grandHosShare - totalExpenses - totalRefunds)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
