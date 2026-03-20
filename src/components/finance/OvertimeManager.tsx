import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPkrAmount } from "@/utils/currency";
import { getCurrentPakistanTime } from "@/utils/timezone";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, Clock, Check, Trash2, Edit, Eye } from "lucide-react";
import jsPDF from "jspdf";

interface OvertimeRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  overtime_hours: number;
  overtime_rate: number;
  overtime_amount: number;
  overtime_date: string;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

interface GroupedEmployee {
  employee_id: string;
  employee_name: string;
  totalHours: number;
  records: OvertimeRecord[];
  status: string; // 'pending' if any pending, 'paid' if all paid
}

function groupByEmployee(records: OvertimeRecord[]): GroupedEmployee[] {
  const map = new Map<string, GroupedEmployee>();
  records.forEach(r => {
    const key = r.employee_name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        totalHours: 0,
        records: [],
        status: 'paid',
      });
    }
    const group = map.get(key)!;
    group.totalHours += Number(r.overtime_hours) || 0;
    group.records.push(r);
    if (r.status === 'pending') group.status = 'pending';
  });
  map.forEach(g => g.records.sort((a, b) => a.overtime_date.localeCompare(b.overtime_date)));
  return Array.from(map.values()).sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

function generateOvertimePDF(group: GroupedEmployee) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Overtime Report', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee: ${group.employee_name}`, 20, 35);
  doc.text(`Total Hours: ${group.totalHours}h`, 20, 43);

  const totalPaid = group.records.filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.overtime_amount) || 0), 0);
  if (totalPaid > 0) {
    doc.text(`Total Paid: Rs. ${totalPaid.toLocaleString()}`, 20, 51);
  }

  // Table header
  let y = 65;
  const cols = [20, 55, 85, 115, 145, pageWidth - 15];
  const headers = ['#', 'Date', 'Hours', 'Rate/Hr', 'Amount', 'Status'];

  doc.setFillColor(59, 130, 246);
  doc.rect(15, y - 6, pageWidth - 30, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => {
    doc.text(h, cols[i], y);
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  y += 10;

  group.records.forEach((r, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // Alternate row bg
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
    }

    doc.setFontSize(9);
    doc.text(String(idx + 1), cols[0], y);
    doc.text(format(new Date(r.overtime_date), 'dd MMM yyyy'), cols[1], y);
    doc.text(`${r.overtime_hours}h`, cols[2], y);
    doc.text(r.status === 'paid' ? `Rs. ${Number(r.overtime_rate).toLocaleString()}` : '-', cols[3], y);
    doc.text(r.status === 'paid' ? `Rs. ${Number(r.overtime_amount).toLocaleString()}` : '-', cols[4], y);
    doc.text(r.status === 'paid' ? 'Paid' : 'Pending', cols[5] - 15, y);
    y += 8;
  });

  // Notes section
  const notedRecords = group.records.filter(r => r.notes);
  if (notedRecords.length > 0) {
    y += 5;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', 20, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    notedRecords.forEach(r => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(`${format(new Date(r.overtime_date), 'dd MMM')}: ${r.notes}`, 25, y);
      y += 5;
    });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  doc.save(`Overtime_${group.employee_name.replace(/\s+/g, '_')}.pdf`);
}

export function OvertimeManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeDate, setOvertimeDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  // Pay dialog state
  const [payingGroup, setPayingGroup] = useState<GroupedEmployee | null>(null);
  const savedRate = localStorage.getItem('overtime_default_rate') || '';
  const [payRate, setPayRate] = useState("");
  const [showRateSetting, setShowRateSetting] = useState(false);
  const [defaultRate, setDefaultRate] = useState(savedRate);

  // Edit dialog state
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Detail view dialog
  const [viewingGroup, setViewingGroup] = useState<GroupedEmployee | null>(null);

  // Fetch staff
  const { data: staff } = useQuery({
    queryKey: ['staff-for-overtime'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['staff', 'doctor', 'admin', 'pharmacy', 'nursing', 'ota', 'lab'])
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch overtime records
  const { data: overtimeRecords, isLoading } = useQuery({
    queryKey: ['overtime-records', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('overtime_records')
        .select('*')
        .order('overtime_date', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OvertimeRecord[];
    }
  });

  const grouped = groupByEmployee(overtimeRecords || []);

  // Create or accumulate overtime record
  const createMutation = useMutation({
    mutationFn: async () => {
      const hours = parseFloat(overtimeHours) || 0;
      const name = employeeName.trim();
      if (!name) throw new Error("Employee name is required");

      const { data: existingRecords } = await supabase
        .from('overtime_records')
        .select('*')
        .ilike('employee_name', name)
        .eq('overtime_date', overtimeDate)
        .eq('status', 'pending');

      const existing = existingRecords?.[0];

      if (existing) {
        const newHours = (Number(existing.overtime_hours) || 0) + hours;
        const combinedNotes = [existing.notes, notes.trim()].filter(Boolean).join('; ');
        const { error } = await supabase
          .from('overtime_records')
          .update({ overtime_hours: newHours, notes: combinedNotes || null })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const empId = selectedEmployeeId || crypto.randomUUID();
        const { error } = await supabase
          .from('overtime_records')
          .insert({
            employee_id: empId,
            employee_name: name,
            overtime_hours: hours,
            overtime_rate: 0,
            overtime_amount: 0,
            overtime_date: overtimeDate,
            notes: notes.trim() || null,
            created_by: user?.id,
            status: 'pending',
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-records'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Overtime hours recorded" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  // Edit overtime hours
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingRecord) return;
      const { error } = await supabase
        .from('overtime_records')
        .update({
          overtime_hours: parseFloat(editHours) || 0,
          notes: editNotes.trim() || null,
        })
        .eq('id', editingRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-records'] });
      setEditingRecord(null);
      toast({ title: "Overtime record updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  // Mark all pending records for an employee as paid
  const markPaidMutation = useMutation({
    mutationFn: async () => {
      if (!payingGroup) return;
      const { data: userData } = await supabase.auth.getUser();
      const rate = parseFloat(payRate) || 0;
      const pendingRecords = payingGroup.records.filter(r => r.status === 'pending');

      for (const record of pendingRecords) {
        const amount = Number(record.overtime_hours) * rate;
        const { error } = await supabase
          .from('overtime_records')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            overtime_rate: rate,
            overtime_amount: amount,
          })
          .eq('id', record.id);
        if (error) throw error;
      }

      // Single expense entry for total
      const totalHours = pendingRecords.reduce((s, r) => s + (Number(r.overtime_hours) || 0), 0);
      const totalAmount = totalHours * rate;
      const dateRange = pendingRecords.length === 1
        ? format(new Date(pendingRecords[0].overtime_date), 'dd MMM yyyy')
        : `${format(new Date(pendingRecords[0].overtime_date), 'dd MMM')} - ${format(new Date(pendingRecords[pendingRecords.length - 1].overtime_date), 'dd MMM yyyy')}`;

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          category: 'Overtime',
          description: `Overtime payment for ${payingGroup.employee_name} (${totalHours}h @ ${formatPkrAmount(rate)}/h) - ${dateRange}`,
          amount: totalAmount,
          expense_date: getCurrentPakistanTime().toISOString().split('T')[0],
          created_by: userData.user?.id,
        });
      if (expenseError) throw expenseError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-records'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setPayingGroup(null);
      setPayRate("");
      toast({ title: "All overtime records marked as paid and added to expenses" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  // Delete a single record
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('overtime_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-records'] });
      setViewingGroup(null);
      toast({ title: "Overtime record deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setSelectedEmployeeId("");
    setEmployeeName("");
    setOvertimeHours("");
    setOvertimeDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes("");
    setSearchQuery("");
  };

  const totalPendingHours = grouped.reduce((s, g) => s + g.records.filter(r => r.status === 'pending').reduce((ss, r) => ss + (Number(r.overtime_hours) || 0), 0), 0);
  const totalPaidAmount = (overtimeRecords || []).filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.overtime_amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalPendingHours}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalPaidAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grouped.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Overtime Records
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Overtime
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Overtime Hours</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee Name (type or search)</Label>
                    <Input
                      value={employeeName}
                      onChange={(e) => {
                        setEmployeeName(e.target.value);
                        setSearchQuery(e.target.value);
                        setSelectedEmployeeId("");
                        const match = staff?.find(emp =>
                          `${emp.first_name} ${emp.last_name}`.toLowerCase() === e.target.value.toLowerCase()
                        );
                        if (match) {
                          setSelectedEmployeeId(match.id);
                        }
                      }}
                      placeholder="Type employee name..."
                    />
                    {searchQuery && staff && (
                      <div className="mt-1 border rounded-md bg-background max-h-32 overflow-y-auto shadow-lg">
                        {staff
                          .filter(emp => `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 5)
                          .map(emp => (
                            <div
                              key={emp.id}
                              className="p-2 hover:bg-muted cursor-pointer text-sm"
                              onClick={() => {
                                setSelectedEmployeeId(emp.id);
                                setEmployeeName(`${emp.first_name} ${emp.last_name}`);
                                setSearchQuery("");
                              }}
                            >
                              {emp.first_name} {emp.last_name} ({emp.role})
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Overtime Hours</Label>
                      <Input type="number" step="0.5" min="0" value={overtimeHours} onChange={(e) => setOvertimeHours(e.target.value)} placeholder="e.g. 2.5" />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={overtimeDate} onChange={(e) => setOvertimeDate(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for overtime..." />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    If this employee already has pending overtime for this date, hours will be added to the existing record.
                  </p>
                  <Button
                    onClick={() => createMutation.mutate()}
                    className="w-full"
                    disabled={createMutation.isPending || !employeeName || !overtimeHours}
                  >
                    {createMutation.isPending ? "Saving..." : "Add Overtime Hours"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Grouped Table - One row per employee */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="text-center">Total Hours</TableHead>
                  <TableHead className="text-center">Entries</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : grouped.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No overtime records found
                    </TableCell>
                  </TableRow>
                ) : (
                  grouped.map(group => {
                    const pendingCount = group.records.filter(r => r.status === 'pending').length;
                    const paidAmount = group.records.filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.overtime_amount) || 0), 0);
                    return (
                      <TableRow key={group.employee_id}>
                        <TableCell className="font-medium">{group.employee_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-semibold">{group.totalHours}h</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {group.records.length} {group.records.length === 1 ? 'entry' : 'entries'}
                        </TableCell>
                        <TableCell>
                          {pendingCount > 0 ? (
                            <Badge variant="secondary" className="capitalize">Pending ({pendingCount})</Badge>
                          ) : (
                            <Badge variant="default" className="capitalize">Paid ({formatPkrAmount(paidAmount)})</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingGroup(group)}
                            >
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                            {pendingCount > 0 && (
                              <Button
                                size="sm"
                                onClick={() => {
                                   setPayingGroup(group);
                                   setPayRate(localStorage.getItem('overtime_default_rate') || "");
                                 }}
                              >
                                <Check className="w-3 h-3 mr-1" /> Pay
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Detail Dialog - date-wise breakdown */}
      <Dialog open={!!viewingGroup} onOpenChange={(o) => { if (!o) setViewingGroup(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Overtime Details - {viewingGroup?.employee_name}</DialogTitle>
          </DialogHeader>
          {viewingGroup && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div>
                  <p className="text-sm font-semibold">Total Hours: {viewingGroup.totalHours}h</p>
                  <p className="text-xs text-muted-foreground">{viewingGroup.records.length} entries</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => generateOvertimePDF(viewingGroup)}>
                  <Eye className="w-3 h-3 mr-1" /> Download PDF
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Hours</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingGroup.records.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">{format(new Date(record.overtime_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{record.overtime_hours}h</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[120px] truncate">{record.notes || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'paid' ? 'default' : 'secondary'} className="capitalize text-xs">
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingRecord(record);
                                setEditHours(String(record.overtime_hours));
                                setEditNotes(record.notes || "");
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              onClick={() => deleteMutation.mutate(record.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Dialog - pay all pending records for this employee */}
      <Dialog open={!!payingGroup} onOpenChange={(o) => { if (!o) { setPayingGroup(null); setPayRate(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Overtime</DialogTitle>
          </DialogHeader>
          {payingGroup && (() => {
            const pendingRecords = payingGroup.records.filter(r => r.status === 'pending');
            const pendingHours = pendingRecords.reduce((s, r) => s + (Number(r.overtime_hours) || 0), 0);
            return (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Employee</span>
                    <span className="font-semibold">{payingGroup.employee_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending Entries</span>
                    <span className="font-semibold">{pendingRecords.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Pending Hours</span>
                    <span className="font-semibold">{pendingHours}h</span>
                  </div>
                </div>
                <div>
                  <Label>Rate per Hour (PKR)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={payRate}
                    onChange={(e) => setPayRate(e.target.value)}
                    placeholder="e.g. 500"
                    autoFocus
                  />
                </div>
                {payRate && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
                    <p className="text-sm text-green-600">Total Payment</p>
                    <p className="text-xl font-bold text-green-700">
                      {formatPkrAmount(pendingHours * (parseFloat(payRate) || 0))}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayingGroup(null); setPayRate(""); }}>Cancel</Button>
            <Button
              onClick={() => markPaidMutation.mutate()}
              disabled={markPaidMutation.isPending || !payRate || parseFloat(payRate) <= 0}
            >
              {markPaidMutation.isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(o) => { if (!o) setEditingRecord(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Overtime Hours</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm font-semibold">{editingRecord.employee_name}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(editingRecord.overtime_date), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <Label>Overtime Hours</Label>
                <Input type="number" step="0.5" min="0" value={editHours} onChange={(e) => setEditHours(e.target.value)} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRecord(null)}>Cancel</Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={editMutation.isPending || !editHours}
            >
              {editMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
