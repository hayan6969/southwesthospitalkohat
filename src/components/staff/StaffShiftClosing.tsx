import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useShifts } from "@/hooks/useShifts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatPkrAmount } from "@/utils/currency";
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns";
import { toast } from "sonner";
import { Clock, CheckCircle, Send, FileText, Timer, AlertTriangle } from "lucide-react";

export function StaffShiftClosing() {
  const { user, profile } = useAuth();
  const { data: shifts } = useShifts();
  const queryClient = useQueryClient();
  const [overtimeHours, setOvertimeHours] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isOvertimeMode, setIsOvertimeMode] = useState(false);

  const today = new Date();
  const staffShift = (profile as any)?.shift || "morning";
  const activeShiftConfig = shifts?.find((shift) => shift.name.toLowerCase() === String(staffShift).toLowerCase());

  const getShiftWindow = () => {
    if (!activeShiftConfig) {
      return { start: startOfDay(today), end: endOfDay(today) };
    }

    const [startHours, startMinutes = 0, startSeconds = 0] = activeShiftConfig.start_time.split(":").map(Number);
    const [endHours, endMinutes = 0, endSeconds = 0] = activeShiftConfig.end_time.split(":").map(Number);

    let start = new Date(today);
    start.setHours(startHours, startMinutes, startSeconds, 0);

    let end = new Date(today);
    end.setHours(endHours, endMinutes, endSeconds, 0);

    if (end <= start) {
      const endToday = new Date(today);
      endToday.setHours(endHours, endMinutes, endSeconds, 0);
      if (today <= endToday) {
        start = subDays(start, 1);
      } else {
        end = addDays(end, 1);
      }
    }

    return { start, end };
  };

  const shiftWindow = getShiftWindow();

  const { data: todayRevenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['staff-shift-revenue', user?.id, staffShift, shiftWindow.start.toISOString(), shiftWindow.end.toISOString()],
    queryFn: async () => {
      if (!user?.id) return null;

      // Query invoices created by this staff member within the shift window
      // Use paid_at for timing, fall back to created_at for invoices without paid_at
      const { data: byPaidAt, error: err1 } = await supabase
        .from('invoices')
        .select('amount, description, invoice_number, created_at, paid_at, status, created_by')
        .eq('created_by', user.id)
        .eq('status', 'paid')
        .gte('paid_at', shiftWindow.start.toISOString())
        .lte('paid_at', shiftWindow.end.toISOString());

      // Also get invoices by this user that have no paid_at but were created in the window
      const { data: byCreatedAt, error: err2 } = await supabase
        .from('invoices')
        .select('amount, description, invoice_number, created_at, paid_at, status, created_by')
        .eq('created_by', user.id)
        .eq('status', 'paid')
        .is('paid_at', null)
        .gte('created_at', shiftWindow.start.toISOString())
        .lte('created_at', shiftWindow.end.toISOString());

      const error = err1 || err2;
      // Merge and deduplicate
      const allInvoices = [...(byPaidAt || []), ...(byCreatedAt || [])];
      const seen = new Set<string>();
      const invoices = allInvoices.filter(inv => {
        const key = (inv as any).id || `${inv.invoice_number}-${inv.created_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (error) throw error;

      let opd = 0, lab = 0, xray = 0, ot = 0, emergency = 0, misc = 0;

      for (const inv of invoices || []) {
        const desc = (inv.description || '').toLowerCase();
        const num = (inv.invoice_number || '').toLowerCase();
        const amount = Number(inv.amount) || 0;

        if (num.startsWith('xr-') || num.startsWith('xray-') || desc.includes('x-ray') || desc.includes('xray')) {
          xray += amount;
        } else if (num.startsWith('lab-') || desc.includes('lab')) {
          lab += amount;
        } else if (num.startsWith('ot-') || desc.includes('ot procedure') || desc.includes('operation') || desc.includes('surgery')) {
          ot += amount;
        } else if (desc.includes('emergency')) {
          emergency += amount;
        } else if (num.startsWith('inv-') || num.startsWith('opd-') || desc.includes('consultation') || desc.includes('opd')) {
          opd += amount;
        } else {
          misc += amount;
        }
      }

      return {
        total: opd + lab + xray + ot + emergency + misc,
        opd,
        lab,
        xray,
        ot,
        emergency,
        misc,
        invoiceCount: invoices?.length || 0,
        invoices: invoices || [],
      };
    },
    enabled: !!user?.id,
  });

  const { data: previousClosings } = useQuery({
    queryKey: ['staff-shift-closings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('staff_shift_closings').select('*').eq('staff_id', user.id).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const todayRegularClosed = previousClosings?.some((c) => c.closing_date === format(today, 'yyyy-MM-dd') && c.shift === staffShift && !(c as any).is_overtime);
  // Allow multiple overtime submissions - never block overtime mode
  const todayAlreadyClosed = isOvertimeMode ? false : todayRegularClosed;

  const submitClosing = useMutation({
    mutationFn: async () => {
      if (!user?.id || !todayRevenue) throw new Error('Missing data');
      const overtime = parseFloat(overtimeHours) || 0;

      const { error } = await supabase.from('staff_shift_closings').insert({
        staff_id: user.id,
        shift: staffShift,
        closing_date: format(today, 'yyyy-MM-dd'),
        shift_start_time: shiftWindow.start.toISOString(),
        shift_end_time: shiftWindow.end.toISOString(),
        total_revenue: todayRevenue.total,
        opd_revenue: todayRevenue.opd,
        lab_revenue: todayRevenue.lab,
        xray_revenue: todayRevenue.xray,
        ot_revenue: todayRevenue.ot,
        emergency_revenue: todayRevenue.emergency,
        misc_revenue: todayRevenue.misc,
        total_invoices: todayRevenue.invoiceCount,
        overtime_hours: overtime,
        overtime_amount: 0,
        status: 'pending',
        notes: notes.trim() || null,
        summary_data: { invoices: todayRevenue.invoices } as any,
        is_overtime: isOvertimeMode,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(isOvertimeMode ? 'Overtime closing submitted to finance for approval' : 'Shift closing submitted to finance for approval');
      queryClient.invalidateQueries({ queryKey: ['staff-shift-closings'] });
      queryClient.invalidateQueries({ queryKey: ['staff-shift-revenue'] });
      setOvertimeHours('');
      setNotes('');
      setConfirmOpen(false);
      setIsOvertimeMode(false);
    },
    onError: (err: any) => {
      toast.error('Failed to submit shift closing: ' + err.message);
    },
  });

  const revenueBreakdown = [
    { label: "OPD", amount: todayRevenue?.opd || 0, color: "bg-blue-500" },
    { label: "Lab", amount: todayRevenue?.lab || 0, color: "bg-green-500" },
    { label: "X-Ray", amount: todayRevenue?.xray || 0, color: "bg-purple-500" },
    { label: "OT", amount: todayRevenue?.ot || 0, color: "bg-orange-500" },
    { label: "Emergency", amount: todayRevenue?.emergency || 0, color: "bg-red-500" },
    { label: "Misc", amount: todayRevenue?.misc || 0, color: "bg-gray-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Current Shift Summary */}
      <Card className="border-t-4 border-t-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">
                {isOvertimeMode ? '⏱️ Overtime' : staffShift === 'morning' ? '🌅 Morning' : '🌆 Evening'} Shift Closing
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {isOvertimeMode && (
                <Button variant="ghost" size="sm" onClick={() => setIsOvertimeMode(false)}>
                  Back to Regular
                </Button>
              )}
              <Badge variant={isOvertimeMode ? 'outline' : staffShift === 'morning' ? 'default' : 'secondary'}>
                {isOvertimeMode ? 'Overtime' : `${staffShift} Shift`}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(today, 'EEEE, MMMM d, yyyy')} — {isOvertimeMode ? 'Overtime revenue submission' : 'Revenue summary for your shift'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {revenueLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Total Revenue Card */}
              <div className={`p-4 rounded-xl text-center ${isOvertimeMode ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                <p className={`text-sm font-medium ${isOvertimeMode ? 'text-amber-600' : 'text-blue-600'}`}>
                  {isOvertimeMode ? 'Overtime Revenue' : 'Total Revenue'}
                </p>
                <p className={`text-3xl font-bold ${isOvertimeMode ? 'text-amber-700' : 'text-blue-700'}`}>{formatPkrAmount(todayRevenue?.total || 0)}</p>
                <p className={`text-xs mt-1 ${isOvertimeMode ? 'text-amber-500' : 'text-blue-500'}`}>{todayRevenue?.invoiceCount || 0} invoices</p>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {revenueBreakdown.map(item => (
                  <div key={item.label} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <p className="text-sm font-semibold">{formatPkrAmount(item.amount)}</p>
                  </div>
                ))}
              </div>

              {/* Overtime Hours & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    Overtime Hours {isOvertimeMode ? '*' : '(if any)'}
                  </Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(e.target.value)}
                    disabled={todayAlreadyClosed}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes {isOvertimeMode ? '(reason for overtime)' : '(optional)'}</Label>
                  <Textarea
                    placeholder={isOvertimeMode ? "Reason for overtime work..." : "Any shift notes..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={todayAlreadyClosed}
                    className="h-[38px]"
                  />
                </div>
              </div>

              {/* Submit Button */}
              {todayAlreadyClosed ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {isOvertimeMode ? 'Overtime already submitted for today' : 'Shift already closed for today'}
                    </span>
                  </div>
                  {/* Show overtime option when regular shift is closed */}
                  {!isOvertimeMode && todayRegularClosed && (
                    <Button
                      onClick={() => {
                        setIsOvertimeMode(true);
                        setOvertimeHours('');
                        setNotes('');
                      }}
                      variant="outline"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Timer className="w-4 h-4 mr-2" />
                      Submit Overtime Closing
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitClosing.isPending || !todayRevenue || (isOvertimeMode && !overtimeHours)}
                  className={`w-full ${isOvertimeMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isOvertimeMode ? 'Submit Overtime & Send to Finance' : 'Close Shift & Submit to Finance'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Previous Closings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Previous Shift Closings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!previousClosings || previousClosings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No previous closings</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                    <TableHead className="text-center">OT Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previousClosings.map(closing => (
                    <TableRow key={closing.id}>
                      <TableCell className="font-medium">
                        {format(new Date(closing.closing_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="capitalize">
                          {closing.shift}
                        </Badge>
                        {(closing as any).is_overtime && (
                          <Badge variant="secondary" className="text-amber-700 bg-amber-100 text-[10px]">
                            OT
                          </Badge>
                        )}
                      </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPkrAmount(Number(closing.total_revenue) || 0)}
                      </TableCell>
                      <TableCell className="text-center">{closing.total_invoices}</TableCell>
                      <TableCell className="text-center">
                        {Number(closing.overtime_hours) > 0 ? `${closing.overtime_hours}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={closing.status === 'approved' ? 'default' : closing.status === 'rejected' ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {closing.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {isOvertimeMode ? 'Confirm Overtime Submission' : 'Confirm Shift Closing'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {isOvertimeMode 
                ? <>Are you sure you want to submit your <strong>overtime</strong> closing? This will be sent to finance for approval.</>
                : <>Are you sure you want to close your <strong>{staffShift}</strong> shift? This will submit the following summary to finance for approval:</>
              }
            </p>
            <div className="p-3 rounded-lg bg-muted space-y-1">
              <div className="flex justify-between text-sm">
                <span>Total Revenue</span>
                <span className="font-bold">{formatPkrAmount(todayRevenue?.total || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Invoices</span>
                <span className="font-semibold">{todayRevenue?.invoiceCount || 0}</span>
              </div>
              {parseFloat(overtimeHours) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Overtime Hours</span>
                  <span className="font-semibold">{overtimeHours}h</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: 'OPD', val: todayRevenue?.opd },
                { label: 'Lab', val: todayRevenue?.lab },
                { label: 'X-Ray', val: todayRevenue?.xray },
                { label: 'OT', val: todayRevenue?.ot },
                { label: 'Emergency', val: todayRevenue?.emergency },
                { label: 'Misc', val: todayRevenue?.misc },
              ].map(i => (
                <div key={i.label} className="p-2 rounded border text-center">
                  <p className="text-muted-foreground">{i.label}</p>
                  <p className="font-semibold">{formatPkrAmount(Number(i.val) || 0)}</p>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                submitClosing.mutate();
              }}
              disabled={submitClosing.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {submitClosing.isPending ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
