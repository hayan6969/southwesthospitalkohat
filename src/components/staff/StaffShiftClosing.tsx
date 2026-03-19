import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatPkrAmount } from "@/utils/currency";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { Clock, CheckCircle, Send, FileText, Timer, AlertTriangle } from "lucide-react";

export function StaffShiftClosing() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [overtimeHours, setOvertimeHours] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const today = new Date();
  const staffShift = (profile as any)?.shift || "morning";

  // Fetch today's invoices created by this staff
  const { data: todayRevenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['staff-shift-revenue', user?.id, format(today, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user?.id) return null;

      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, description, invoice_number, created_at, status')
        .eq('created_by', user.id)
        .eq('status', 'paid')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      if (error) throw error;

      let opd = 0, lab = 0, xray = 0, ot = 0, emergency = 0, misc = 0;
      
      for (const inv of (invoices || [])) {
        const desc = (inv.description || '').toLowerCase();
        const num = (inv.invoice_number || '').toLowerCase();
        const amount = Number(inv.amount) || 0;

        if (num.startsWith('xray-') || desc.includes('x-ray') || desc.includes('xray')) {
          xray += amount;
        } else if (num.startsWith('lab-') || desc.includes('lab')) {
          lab += amount;
        } else if (num.startsWith('ot-') || desc.includes('operation') || desc.includes('surgery')) {
          ot += amount;
        } else if (desc.includes('emergency')) {
          emergency += amount;
        } else if (num.startsWith('opd-') || desc.includes('consultation') || desc.includes('opd')) {
          opd += amount;
        } else {
          misc += amount;
        }
      }

      const total = opd + lab + xray + ot + emergency + misc;

      return {
        total,
        opd,
        lab,
        xray,
        ot,
        emergency,
        misc,
        invoiceCount: invoices?.length || 0,
        invoices: invoices || []
      };
    },
    enabled: !!user?.id,
  });

  // Fetch previous closings
  const { data: previousClosings } = useQuery({
    queryKey: ['staff-shift-closings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('staff_shift_closings')
        .select('*')
        .eq('staff_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Check if already closed today
  const todayAlreadyClosed = previousClosings?.some(
    c => c.closing_date === format(today, 'yyyy-MM-dd') && c.shift === staffShift
  );

  const submitClosing = useMutation({
    mutationFn: async () => {
      if (!user?.id || !todayRevenue) throw new Error("Missing data");

      const overtime = parseFloat(overtimeHours) || 0;

      const { error } = await supabase
        .from('staff_shift_closings')
        .insert({
          staff_id: user.id,
          shift: staffShift,
          closing_date: format(today, 'yyyy-MM-dd'),
          shift_start_time: new Date().toISOString(),
          shift_end_time: new Date().toISOString(),
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
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift closing submitted to finance for approval");
      queryClient.invalidateQueries({ queryKey: ['staff-shift-closings'] });
      setOvertimeHours("");
      setNotes("");
    },
    onError: (err: any) => {
      toast.error("Failed to submit shift closing: " + err.message);
    }
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
                {staffShift === 'morning' ? '🌅 Morning' : '🌆 Evening'} Shift Closing
              </CardTitle>
            </div>
            <Badge variant={staffShift === 'morning' ? 'default' : 'secondary'}>
              {staffShift === 'morning' ? 'Morning Shift' : 'Evening Shift'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(today, 'EEEE, MMMM d, yyyy')} — Revenue summary for your shift
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
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-700">{formatPkrAmount(todayRevenue?.total || 0)}</p>
                <p className="text-xs text-blue-500 mt-1">{todayRevenue?.invoiceCount || 0} invoices</p>
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

              {/* Overtime & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5" />
                    Overtime Hours (if any)
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
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Any shift notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={todayAlreadyClosed}
                    className="h-[38px]"
                  />
                </div>
              </div>

              {/* Submit Button */}
              {todayAlreadyClosed ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Shift already closed for today</span>
                </div>
              ) : (
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={submitClosing.isPending || !todayRevenue}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Close Shift & Submit to Finance
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
                        <Badge variant="outline" className="capitalize">
                          {closing.shift}
                        </Badge>
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
    </div>
  );
}
