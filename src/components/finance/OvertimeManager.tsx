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
import { Plus, Clock, Check, Trash2, Edit } from "lucide-react";

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
  const [payingRecord, setPayingRecord] = useState<OvertimeRecord | null>(null);
  const [payRate, setPayRate] = useState("");

  // Edit dialog state
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  const [editHours, setEditHours] = useState("");
  const [editNotes, setEditNotes] = useState("");

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
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as OvertimeRecord[];
    }
  });

  // Create or accumulate overtime record (upsert by employee+date)
  const createMutation = useMutation({
    mutationFn: async () => {
      const hours = parseFloat(overtimeHours) || 0;
      const empId = selectedEmployeeId || crypto.randomUUID();

      // Check if a pending record already exists for this employee on this date
      const { data: existing } = await supabase
        .from('overtime_records')
        .select('*')
        .eq('employee_id', empId)
        .eq('overtime_date', overtimeDate)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        // Accumulate hours into existing record
        const newHours = (Number(existing.overtime_hours) || 0) + hours;
        const combinedNotes = [existing.notes, notes.trim()].filter(Boolean).join('; ');
        const { error } = await supabase
          .from('overtime_records')
          .update({
            overtime_hours: newHours,
            notes: combinedNotes || null,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('overtime_records')
          .insert({
            employee_id: empId,
            employee_name: employeeName,
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

  // Mark paid mutation - now takes rate at payment time
  const markPaidMutation = useMutation({
    mutationFn: async () => {
      if (!payingRecord) return;
      const { data: userData } = await supabase.auth.getUser();
      const rate = parseFloat(payRate) || 0;
      const amount = Number(payingRecord.overtime_hours) * rate;

      const { error: updateError } = await supabase
        .from('overtime_records')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          overtime_rate: rate,
          overtime_amount: amount,
        })
        .eq('id', payingRecord.id);
      if (updateError) throw updateError;

      // Add to expenses
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          category: 'Overtime',
          description: `Overtime payment for ${payingRecord.employee_name} (${payingRecord.overtime_hours}h @ ${formatPkrAmount(rate)}/h) - ${format(new Date(payingRecord.overtime_date), 'dd MMM yyyy')}`,
          amount: amount,
          expense_date: getCurrentPakistanTime().toISOString().split('T')[0],
          created_by: userData.user?.id,
        });
      if (expenseError) throw expenseError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-records'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setPayingRecord(null);
      setPayRate("");
      toast({ title: "Overtime marked as paid and added to expenses" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('overtime_records').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime-records'] });
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

  const totalPending = overtimeRecords?.filter(r => r.status === 'pending').reduce((s, r) => s + (Number(r.overtime_hours) || 0), 0) || 0;
  const totalPaid = overtimeRecords?.filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.overtime_amount) || 0), 0) || 0;

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
            <div className="text-2xl font-bold text-orange-600">{totalPending}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPkrAmount(totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overtimeRecords?.length || 0}</div>
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
                    <Label>Search Employee</Label>
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        const match = staff?.find(emp =>
                          `${emp.first_name} ${emp.last_name}`.toLowerCase() === e.target.value.toLowerCase()
                        );
                        if (match) {
                          setSelectedEmployeeId(match.id);
                          setEmployeeName(`${match.first_name} ${match.last_name}`);
                        }
                      }}
                      placeholder="Search staff..."
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
                                setSearchQuery(`${emp.first_name} ${emp.last_name}`);
                              }}
                            >
                              {emp.first_name} {emp.last_name} ({emp.role})
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Employee Name</Label>
                    <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Employee name" />
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

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Hours</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !overtimeRecords || overtimeRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No overtime records found
                    </TableCell>
                  </TableRow>
                ) : (
                  overtimeRecords.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>{format(new Date(record.overtime_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-semibold">{record.overtime_hours}h</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {record.status === 'paid' ? formatPkrAmount(Number(record.overtime_amount)) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{record.notes || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={record.status === 'paid' ? 'default' : 'secondary'} className="capitalize">
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {record.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPayingRecord(record);
                                  setPayRate("");
                                }}
                              >
                                <Check className="w-3 h-3 mr-1" /> Pay
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
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
                                onClick={() => deleteMutation.mutate(record.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pay Dialog - set rate at payment time */}
      <Dialog open={!!payingRecord} onOpenChange={(o) => { if (!o) { setPayingRecord(null); setPayRate(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Pay Overtime</DialogTitle>
          </DialogHeader>
          {payingRecord && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Employee</span>
                  <span className="font-semibold">{payingRecord.employee_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Date</span>
                  <span className="font-semibold">{format(new Date(payingRecord.overtime_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Hours</span>
                  <span className="font-semibold">{payingRecord.overtime_hours}h</span>
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
                    {formatPkrAmount(Number(payingRecord.overtime_hours) * (parseFloat(payRate) || 0))}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPayingRecord(null); setPayRate(""); }}>Cancel</Button>
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
