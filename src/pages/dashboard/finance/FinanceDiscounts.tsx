import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PreviousBillDiscountDialog } from "@/components/dialogs/PreviousBillDiscountDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ReceiptText, Plus, Tag, Search, Clock, Trash2 } from "lucide-react";
import { useSearchPatientsWithNames } from "@/hooks/useDisplayHelpers";

export default function FinanceDiscounts() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [prevBillDialogOpen, setPrevBillDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Assign discount form state
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientLabel, setSelectedPatientLabel] = useState("");
  const [serviceType, setServiceType] = useState("consultation");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [discountNotes, setDiscountNotes] = useState("");

  const { data: searchResults } = useSearchPatientsWithNames(patientSearch);

  // Fetch all discounts with patient info
  const { data: discounts, isLoading } = useQuery({
    queryKey: ['all-patient-discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_discounts')
        .select(`
          *,
          patient:patients!patient_discounts_patient_id_fkey(
            patient_number,
            profiles:profiles!patients_id_fkey(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000, // Auto-refresh every 10s to catch discount usage
  });

  const filteredDiscounts = discounts?.filter(d => {
    if (!searchFilter) return true;
    const lower = searchFilter.toLowerCase();
    const patientProfiles = d.patient?.profiles as any;
    const name = `${patientProfiles?.first_name || ''} ${patientProfiles?.last_name || ''}`.toLowerCase();
    const patientNum = (d.patient?.patient_number || '').toLowerCase();
    return name.includes(lower) || patientNum.includes(lower);
  }) || [];

  const activeDiscounts = filteredDiscounts.filter(d => d.is_active && !d.used_at);
  const usedOrExpiredDiscounts = filteredDiscounts.filter(d => !d.is_active || d.used_at);

  const assignDiscount = useMutation({
    mutationFn: async () => {
      if (!selectedPatientId || !discountValue) throw new Error("Missing fields");

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { error } = await supabase
        .from('patient_discounts')
        .insert({
          patient_id: selectedPatientId,
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          service_type: serviceType,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          notes: discountNotes.trim() || null,
          created_by: profile?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Discount assigned successfully");
      queryClient.invalidateQueries({ queryKey: ['all-patient-discounts'] });
      setAssignDialogOpen(false);
      resetAssignForm();
    },
    onError: (err: any) => {
      toast.error("Failed to assign discount: " + err.message);
    },
  });

  const deactivateDiscount = useMutation({
    mutationFn: async (discountId: string) => {
      const { error } = await supabase
        .from('patient_discounts')
        .update({ is_active: false })
        .eq('id', discountId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Discount deactivated");
      queryClient.invalidateQueries({ queryKey: ['all-patient-discounts'] });
    },
  });

  const deleteDiscount = useMutation({
    mutationFn: async (discountId: string) => {
      const { error } = await supabase
        .from('patient_discounts')
        .delete()
        .eq('id', discountId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Discount deleted");
      queryClient.invalidateQueries({ queryKey: ['all-patient-discounts'] });
    },
  });

  const resetAssignForm = () => {
    setPatientSearch("");
    setSelectedPatientId(null);
    setSelectedPatientLabel("");
    setServiceType("consultation");
    setDiscountType("percentage");
    setDiscountValue("");
    setDiscountNotes("");
  };

  const getStatusBadge = (discount: any) => {
    if (discount.used_at) {
      return <Badge variant="secondary">Used</Badge>;
    }
    if (!discount.is_active) {
      return <Badge variant="outline">Inactive</Badge>;
    }
    if (discount.expires_at && new Date(discount.expires_at) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-500 hover:bg-green-600 text-white">Active</Badge>;
  };

  const getExpiryText = (discount: any) => {
    if (discount.used_at) {
      return `Used ${formatDistanceToNow(new Date(discount.used_at), { addSuffix: true })}`;
    }
    if (discount.expires_at) {
      const expiresDate = new Date(discount.expires_at);
      if (expiresDate < new Date()) {
        return `Expired ${formatDistanceToNow(expiresDate, { addSuffix: true })}`;
      }
      return `in ${formatDistanceToNow(expiresDate)}`;
    }
    return "No expiry";
  };

  const serviceColors: Record<string, string> = {
    consultation: "bg-blue-100 text-blue-700",
    lab: "bg-green-100 text-green-700",
    xray: "bg-purple-100 text-purple-700",
    ot: "bg-orange-100 text-orange-700",
  };

  const allDisplayed = [...activeDiscounts, ...usedOrExpiredDiscounts];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Patient Discounts</h2>
          <p className="text-muted-foreground text-sm">Assign permanent discounts to patients for hospital invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPrevBillDialogOpen(true)} className="gap-2">
            <ReceiptText className="w-4 h-4" />
            Discount on Previous Bill
          </Button>
          <Button onClick={() => setAssignDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Assign Discount
          </Button>
        </div>
      </div>

      {/* Active Discounts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Tag className="w-5 h-5" />
              Active Discounts ({activeDiscounts.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
            </div>
          ) : allDisplayed.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No discounts found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Patient #</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDisplayed.map(discount => {
                    const patientProfiles = discount.patient?.profiles as any;
                    const patientName = `${patientProfiles?.first_name || ''} ${patientProfiles?.last_name || ''}`.trim() || 'Unknown';
                    const isActive = discount.is_active && !discount.used_at && !(discount.expires_at && new Date(discount.expires_at) < new Date());

                    return (
                      <TableRow key={discount.id} className={!isActive ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{patientName}</TableCell>
                        <TableCell>{discount.patient?.patient_number || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={serviceColors[discount.service_type] || ""}>
                            {discount.service_type === 'consultation' ? 'Consultation' :
                             discount.service_type === 'lab' ? 'Lab' :
                             discount.service_type === 'xray' ? 'X-Ray' :
                             discount.service_type === 'ot' ? 'OT' : discount.service_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {discount.discount_type === 'percentage' ? `% ${discount.discount_value}%` : formatPkrAmount(discount.discount_value)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            {getExpiryText(discount)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(discount)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {isActive && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deactivateDiscount.mutate(discount.id)}
                                disabled={deactivateDiscount.isPending}
                              >
                                Deactivate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => deleteDiscount.mutate(discount.id)}
                              disabled={deleteDiscount.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Discount Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(v) => { setAssignDialogOpen(v); if (!v) resetAssignForm(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Assign Patient Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Patient Search */}
            <div className="space-y-2">
              <Label>Patient</Label>
              {selectedPatientId ? (
                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <span className="font-medium">{selectedPatientLabel}</span>
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedPatientId(null); setSelectedPatientLabel(""); }}>
                    Change
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Search by name, phone, or CNIC..."
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                  />
                  {patientSearch.length >= 2 && searchResults && searchResults.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {searchResults.map((p: any) => (
                        <button
                          key={p.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                          onClick={() => {
                            setSelectedPatientId(p.id);
                            setSelectedPatientLabel(`${p.profile?.first_name} ${p.profile?.last_name} (${p.patient_number})`);
                            setPatientSearch("");
                          }}
                        >
                          <span className="font-medium">{p.profile?.first_name} {p.profile?.last_name}</span>
                          <span className="text-muted-foreground ml-2">{p.patient_number}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="xray">X-Ray</SelectItem>
                  <SelectItem value="ot">OT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (Rs.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder={discountType === 'percentage' ? "e.g. 10" : "e.g. 500"}
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Reason for discount..."
                value={discountNotes}
                onChange={e => setDiscountNotes(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Discount is single-use and expires in 48 hours. It will be automatically applied when the next {serviceType} invoice is generated for this patient.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => assignDiscount.mutate()}
              disabled={!selectedPatientId || !discountValue || assignDiscount.isPending}
            >
              {assignDiscount.isPending ? "Assigning..." : "Assign Discount"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviousBillDiscountDialog open={prevBillDialogOpen} onOpenChange={setPrevBillDialogOpen} />
    </div>
  );
}
