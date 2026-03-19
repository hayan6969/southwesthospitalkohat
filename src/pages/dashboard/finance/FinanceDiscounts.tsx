import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPkrAmount } from "@/utils/currency";
import { toast } from "sonner";
import { Plus, Percent, Trash2, Search, Tag, Clock, CheckCircle2, ReceiptText } from "lucide-react";
import { PreviousBillDiscountDialog } from "@/components/dialogs/PreviousBillDiscountDialog";

export default function FinanceDiscounts() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [prevBillDialogOpen, setPrevBillDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [discountType, setDiscountType] = useState<string>("percentage");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [serviceType, setServiceType] = useState<string>("consultation");
  const [notes, setNotes] = useState("");

  // Fetch existing discounts with patient info
  const { data: discounts, isLoading } = useQuery({
    queryKey: ['patient-discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_discounts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      // Fetch patient profiles for each discount
      if (data && data.length > 0) {
        const patientIds = data.map((d: any) => d.patient_id);
        const [profilesRes, patientsRes] = await Promise.all([
          supabase.from('profiles').select('id, first_name, last_name, phone').in('id', patientIds),
          supabase.from('patients').select('id, patient_number').in('id', patientIds)
        ]);
        
        return data.map((d: any) => ({
          ...d,
          profile: profilesRes.data?.find((p: any) => p.id === d.patient_id),
          patient: patientsRes.data?.find((p: any) => p.id === d.patient_id),
        }));
      }
      return data || [];
    }
  });

  // Search patients
  const { data: searchedPatients } = useQuery({
    queryKey: ['search-patients-discount', patientSearch],
    queryFn: async () => {
      if (!patientSearch || patientSearch.length < 2) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone')
        .eq('role', 'patient')
        .or(`first_name.ilike.%${patientSearch}%,last_name.ilike.%${patientSearch}%,phone.ilike.%${patientSearch}%`)
        .limit(10);
      if (error) throw error;

      // Also get patient numbers
      if (data && data.length > 0) {
        const ids = data.map(p => p.id);
        const { data: patients } = await supabase
          .from('patients')
          .select('id, patient_number')
          .in('id', ids);
        
        return data.map(p => ({
          ...p,
          patient_number: patients?.find(pt => pt.id === p.id)?.patient_number || 'N/A'
        }));
      }
      return [];
    },
    enabled: patientSearch.length >= 2
  });

  // Create discount
  const createDiscount = useMutation({
    mutationFn: async () => {
      if (!selectedPatientId) throw new Error("Select a patient");
      if (discountValue <= 0) throw new Error("Enter a valid discount value");
      if (discountType === 'percentage' && discountValue > 100) throw new Error("Percentage cannot exceed 100");

      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from('patient_discounts').insert({
        patient_id: selectedPatientId,
        discount_type: discountType,
        discount_value: discountValue,
        service_type: serviceType,
        notes,
        is_active: true,
        created_by: profile?.id,
        expires_at: expiresAt,
        used_at: null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-discounts'] });
      toast.success("Discount assigned successfully");
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to assign discount")
  });

  // Toggle active status
  const toggleDiscount = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('patient_discounts').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-discounts'] });
      toast.success("Discount updated");
    }
  });

  // Delete discount
  const deleteDiscount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('patient_discounts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-discounts'] });
      toast.success("Discount removed");
    }
  });

  const resetForm = () => {
    setSelectedPatientId("");
    setPatientSearch("");
    setDiscountType("percentage");
    setDiscountValue(0);
    setServiceType("consultation");
    setNotes("");
  };

  const filtered = discounts?.filter((d: any) => {
    if (!searchTerm) return true;
    const name = `${d.profile?.first_name || ''} ${d.profile?.last_name || ''}`.toLowerCase();
    const pNum = d.patient?.patient_number?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || pNum.includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Patient Discounts</h2>
          <p className="text-muted-foreground text-sm">Assign permanent discounts to patients for hospital invoices</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPrevBillDialogOpen(true)}>
            <ReceiptText className="w-4 h-4 mr-2" />Discount on Previous Bill
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Assign Discount</Button>
            </DialogTrigger>
          <DialogContent className="z-[9999] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Patient Discount</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Search Patient</Label>
                <Input
                  placeholder="Search by name or phone..."
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatientId(""); }}
                />
                {searchedPatients && searchedPatients.length > 0 && !selectedPatientId && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {searchedPatients.map((p: any) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between"
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch(`${p.first_name} ${p.last_name} (${p.patient_number})`);
                        }}
                      >
                        <span>{p.first_name} {p.last_name}</span>
                        <span className="text-muted-foreground">{p.patient_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="lab">Lab Test</SelectItem>
                    <SelectItem value="xray">X-ray</SelectItem>
                    <SelectItem value="ot">OT / Surgery</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    max={discountType === 'percentage' ? 100 : undefined}
                    value={discountValue || ''}
                    onChange={(e) => setDiscountValue(e.target.value === '' ? 0 : Number(e.target.value))}
                    placeholder={discountType === 'percentage' ? "e.g. 10" : "e.g. 500"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for discount..."
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => createDiscount.mutate()}
                disabled={!selectedPatientId || discountValue <= 0 || createDiscount.isPending}
              >
                {createDiscount.isPending ? "Saving..." : "Assign Discount"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <PreviousBillDiscountDialog open={prevBillDialogOpen} onOpenChange={setPrevBillDialogOpen} />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Active Discounts ({filtered.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No discounts assigned yet</p>
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
                  {filtered.map((d: any) => {
                    const isExpired = d.expires_at && new Date(d.expires_at) < new Date();
                    const isUsed = !!d.used_at;
                    const statusLabel = isUsed ? "Used" : isExpired ? "Expired" : d.is_active ? "Active" : "Inactive";
                    const statusVariant = isUsed ? "outline" : isExpired ? "destructive" : d.is_active ? "default" : "outline";

                    return (
                      <TableRow key={d.id} className={isUsed || isExpired ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          {d.profile?.first_name} {d.profile?.last_name}
                        </TableCell>
                        <TableCell>{d.patient?.patient_number || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {d.service_type === 'ot' ? 'OT' : d.service_type || 'Consultation'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            {d.discount_type === 'percentage' ? (
                              <><Percent className="w-3 h-3" />{d.discount_value}%</>
                            ) : (
                              formatPkrAmount(d.discount_value)
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {isUsed ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Used {formatDistanceToNow(new Date(d.used_at), { addSuffix: true })}
                            </span>
                          ) : d.expires_at ? (
                            <span className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                              <Clock className="w-3.5 h-3.5" />
                              {isExpired ? 'Expired' : formatDistanceToNow(new Date(d.expires_at), { addSuffix: true })}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant as any}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!isUsed && !isExpired && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleDiscount.mutate({ id: d.id, is_active: !d.is_active })}
                              >
                                {d.is_active ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteDiscount.mutate(d.id)}
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
    </div>
  );
}
