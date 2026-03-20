import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPkrAmount } from "@/utils/currency";
import { format } from "date-fns";
import { toast } from "sonner";
import { Users, CheckCircle, XCircle, Eye, Clock, DollarSign } from "lucide-react";

export default function FinanceStaffPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [detailClosing, setDetailClosing] = useState<any>(null);
  

  const { data: closings, isLoading } = useQuery({
    queryKey: ['all-staff-shift-closings', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('staff_shift_closings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch staff profiles
      const staffIds = [...new Set((data || []).map(c => c.staff_id))];
      let profiles: any[] = [];
      if (staffIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, shift')
          .in('id', staffIds);
        profiles = profileData || [];
      }

      return (data || []).map(c => ({
        ...c,
        staff_name: (() => {
          const p = profiles.find(p => p.id === c.staff_id);
          return p ? `${p.first_name} ${p.last_name}` : 'Unknown';
        })(),
        staff_shift: profiles.find(p => p.id === c.staff_id)?.shift || c.shift,
      }));
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, overtimeAmt }: { id: string; status: string; overtimeAmt?: number }) => {
      const updates: any = {
        status,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      };
      if (overtimeAmt !== undefined) {
        updates.overtime_amount = overtimeAmt;
      }
      const { error } = await supabase
        .from('staff_shift_closings')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Shift closing updated");
      queryClient.invalidateQueries({ queryKey: ['all-staff-shift-closings'] });
      setDetailClosing(null);
      setOvertimeAmount("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            Staff Shift Payments
          </h2>
          <p className="text-muted-foreground text-sm">Review and approve staff shift closings and overtime</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-center">Invoices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !closings || closings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No shift closings found
                    </TableCell>
                  </TableRow>
                ) : (
                  closings.map(closing => (
                    <TableRow key={closing.id}>
                      <TableCell className="font-medium">{closing.staff_name}</TableCell>
                      <TableCell>{format(new Date(closing.closing_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{closing.shift}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPkrAmount(Number(closing.total_revenue) || 0)}
                      </TableCell>
                      <TableCell className="text-center">{closing.total_invoices}</TableCell>
                      <TableCell>
                        <Badge
                          variant={closing.status === 'approved' ? 'default' : closing.status === 'rejected' ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {closing.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => setDetailClosing(closing)}>
                            <Eye className="w-3 h-3 mr-1" /> View
                          </Button>
                          {closing.status === 'pending' && (
                            <>
                              <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: closing.id, status: 'approved' })}>
                                <CheckCircle className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: closing.id, status: 'rejected' })}>
                                <XCircle className="w-3 h-3" />
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

      {/* Detail Dialog */}
      <Dialog open={!!detailClosing} onOpenChange={(o) => !o && setDetailClosing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Shift Closing Details
            </DialogTitle>
          </DialogHeader>
          {detailClosing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Staff</p>
                  <p className="font-semibold">{detailClosing.staff_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground">Date & Shift</p>
                  <p className="font-semibold">{format(new Date(detailClosing.closing_date), 'MMM d, yyyy')} — {detailClosing.shift}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-700">{formatPkrAmount(Number(detailClosing.total_revenue))}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'OPD', value: detailClosing.opd_revenue },
                  { label: 'Lab', value: detailClosing.lab_revenue },
                  { label: 'X-Ray', value: detailClosing.xray_revenue },
                  { label: 'OT', value: detailClosing.ot_revenue },
                  { label: 'Emergency', value: detailClosing.emergency_revenue },
                  { label: 'Misc', value: detailClosing.misc_revenue },
                ].map(item => (
                  <div key={item.label} className="p-2 rounded border text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold">{formatPkrAmount(Number(item.value) || 0)}</p>
                  </div>
                ))}
              </div>




              {detailClosing.notes && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{detailClosing.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
