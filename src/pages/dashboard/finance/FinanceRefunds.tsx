import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { getCurrentPakistanTime } from "@/utils/timezone";
import { generateRefundSlipPDF } from "@/utils/refundSlipGenerator";
import { RefreshCw, Plus, Filter, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Upload, Image as ImageIcon, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface RefundFormData {
  amount: string;
  refundType: string;
  description: string;
  doctorId?: string;
}

interface PathologyOrderItem {
  id: string;
  test_type_id: string;
  test_name_snapshot: string;
  price: number;
}

interface PathologyOrder {
  id: string;
  order_number: string;
  patient_id: string;
  invoice_id: string | null;
  total_amount: number;
  payment_status: string;
  lab_status: string;
  lab_pathology_order_items: PathologyOrderItem[];
  patient?: {
    patient_number: string;
    profile?: {
      first_name: string;
      last_name: string;
      phone: string | null;
    };
  };
}

export default function FinanceRefunds() {
  const { profile } = useAuth();
  const { logCreate } = useAuditLogger();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<RefundFormData>({
    amount: "",
    refundType: "",
    description: "",
    doctorId: ""
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<PathologyOrder | null>(null);
  const [orderSearchResults, setOrderSearchResults] = useState<PathologyOrder[]>([]);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set());
  const [showLabConfirm, setShowLabConfirm] = useState(false);
  // Actual amount the patient paid (invoice amount, after any discount). The
  // order_items prices are catalog snapshots and don't reflect discounts.
  const [invoiceAmount, setInvoiceAmount] = useState<number | null>(null);
  
  // Filtering and pagination state
  const [filteredRefunds, setFilteredRefunds] = useState<any[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch doctors for dropdown
  const { data: doctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'doctor')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing refunds
  const { data: refunds, isLoading } = useQuery({
    queryKey: ['refunds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          doctor:profiles!doctor_id(first_name, last_name),
          processed_by_profile:profiles!processed_by(first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Filter refunds based on date range and search term
  useEffect(() => {
    if (!refunds) {
      setFilteredRefunds([]);
      return;
    }

    let filtered = [...refunds];

    // Filter by date range
    if (startDate && endDate) {
      filtered = filtered.filter(refund => {
        const refundDate = new Date(refund.created_at);
        return refundDate >= startDate && refundDate <= endDate;
      });
    }

    // Filter by search term (description, refund type, doctor name)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(refund => 
        refund.description?.toLowerCase().includes(search) ||
        getRefundTypeLabel(refund.refund_type).toLowerCase().includes(search) ||
        (refund.doctor && `Dr. ${refund.doctor.first_name} ${refund.doctor.last_name}`.toLowerCase().includes(search)) ||
        formatPkrAmount(refund.amount).toLowerCase().includes(search)
      );
    }

    setFilteredRefunds(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [refunds, startDate, endDate, searchTerm]);

  // Clear filters function
  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchTerm("");
  };

  // Lookup pathology order
  const lookupPathologyOrder = async () => {
    const q = orderSearch.trim();
    if (!q) {
      toast.error("Enter an order number");
      return;
    }
    setSearchingOrders(true);
    setSelectedOrder(null);
    setSelectedTestIds(new Set());
    try {
      // Try order number first; if not found, try invoice number
      let { data: order, error } = await supabase
        .from('lab_pathology_orders')
        .select('*, lab_pathology_order_items(*)')
        .eq('payment_status', 'paid')
        .eq('order_number', q)
        .maybeSingle();

      if (error) throw error;

      if (!order) {
        // Fallback: try to find order by invoice number
        const { data: inv } = await supabase
          .from('invoices')
          .select('id')
          .eq('invoice_number', q)
          .maybeSingle();

        if (inv) {
          const { data: orderByInv } = await supabase
            .from('lab_pathology_orders')
            .select('*, lab_pathology_order_items(*)')
            .eq('payment_status', 'paid')
            .eq('invoice_id', inv.id)
            .maybeSingle();
          order = orderByInv;
        }
      }

      if (!order) {
        toast.error("Order not found or already cancelled");
        return;
      }

      // Fetch patient number + profile separately (no FK constraints)
      const [patientRes, profileRes] = await Promise.all([
        supabase.from('patients').select('patient_number').eq('id', order.patient_id).maybeSingle(),
        supabase.from('profiles').select('first_name, last_name, phone').eq('id', order.patient_id).maybeSingle(),
      ]);
      const patientProfile = patientRes.data?.patient_number
        ? { patient_number: patientRes.data.patient_number, profile: profileRes.data || undefined }
        : undefined;

      // Pull the linked invoice's actual (post-discount) amount for the refund.
      let invAmount: number | null = null;
      if (order.invoice_id) {
        const { data: inv } = await supabase
          .from('invoices')
          .select('amount')
          .eq('id', order.invoice_id)
          .maybeSingle();
        invAmount = inv?.amount != null ? Number(inv.amount) : null;
      }
      setInvoiceAmount(invAmount);

      setSelectedOrder({ ...order, patient: patientProfile || undefined } as unknown as PathologyOrder);
      setFormData(prev => ({ ...prev, description: `Test cancellation for order ${order.order_number}` }));
    } catch (err) {
      console.error('Error looking up order:', err);
      toast.error("Failed to look up order");
    } finally {
      setSearchingOrders(false);
    }
  };

  const toggleTestItem = (itemId: string) => {
    setSelectedTestIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const clearLabSelection = () => {
    setSelectedOrder(null);
    setOrderSearch("");
    setSelectedTestIds(new Set());
    setInvoiceAmount(null);
    setFormData(prev => ({ ...prev, amount: "", description: "" }));
  };

  const allItems = selectedOrder?.lab_pathology_order_items || [];
  const selectedItems = allItems.filter(item => selectedTestIds.has(item.id));
  const catalogTotal = allItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const selectedCatalog = selectedItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const isFullSelection = allItems.length > 0 && selectedItems.length === allItems.length;
  // Base the refund on the invoice's actual (post-discount) amount, allocated
  // proportionally to the selected tests' catalog share for a partial selection.
  const labRefundAmount = invoiceAmount != null
    ? (isFullSelection
        ? invoiceAmount
        : catalogTotal > 0 ? Math.round((invoiceAmount * selectedCatalog) / catalogTotal) : 0)
    : selectedCatalog;
  const isDiscounted = invoiceAmount != null && invoiceAmount < catalogTotal;

  // Pagination logic for filtered data
  const totalPages = Math.ceil(filteredRefunds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRefunds = filteredRefunds.slice(startIndex, endIndex);

  const uploadProofFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `refund-${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('finance-proofs')
      .upload(fileName, file);
    if (error) {
      console.error('Proof upload error:', error);
      return null;
    }
    const { data: urlData } = supabase.storage.from('finance-proofs').getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  // Create refund mutation
  const createRefundMutation = useMutation({
    mutationFn: async (refundData: RefundFormData) => {
      let proofUrl: string | null = null;
      if (proofFile) {
        setUploadingProof(true);
        proofUrl = await uploadProofFile(proofFile);
        setUploadingProof(false);
      }

      // If lab refund: full selection cancels whole order + voids invoice.
      // Partial selection only removes the selected tests and reduces the
      // invoice amount so remaining tests stay visible/processable in Lab.
      if (refundData.refundType === 'lab' && selectedOrder) {
        if (isFullSelection || selectedItems.length === 0) {
          const { error: cancelError } = await supabase
            .from('lab_pathology_orders')
            .update({
              payment_status: 'cancelled',
              lab_status: 'cancelled'
            })
            .eq('id', selectedOrder.id);

          if (cancelError) throw cancelError;

          if (selectedOrder.invoice_id) {
            const { error: invError } = await supabase
              .from('invoices')
              .update({ status: 'cancelled' })
              .eq('id', selectedOrder.invoice_id);
            if (invError) console.error('Error voiding invoice:', invError);
          }
        } else {
          // Partial: delete only the selected order items, keep order active
          const idsToRemove = selectedItems.map(i => i.id);
          const { error: delError } = await supabase
            .from('lab_pathology_order_items')
            .delete()
            .in('id', idsToRemove);
          if (delError) throw delError;

          const newTotal = Math.max(0, Number(selectedOrder.total_amount || 0) - selectedCatalog);
          const { error: updOrderError } = await supabase
            .from('lab_pathology_orders')
            .update({ total_amount: newTotal })
            .eq('id', selectedOrder.id);
          if (updOrderError) console.error('Error updating order total:', updOrderError);

          if (selectedOrder.invoice_id && invoiceAmount != null) {
            const newInvoiceAmount = Math.max(0, invoiceAmount - parseFloat(refundData.amount));
            const { error: invError } = await supabase
              .from('invoices')
              .update({ amount: newInvoiceAmount })
              .eq('id', selectedOrder.invoice_id);
            if (invError) console.error('Error adjusting invoice:', invError);
          }
        }
      }

      const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .insert({
          amount: parseFloat(refundData.amount),
          refund_type: refundData.refundType,
          description: refundData.description,
          doctor_id: refundData.doctorId || null,
          patient_id: selectedOrder?.patient_id || null,
          related_record_id: selectedOrder?.id || null,
          processed_by: profile?.id,
          proof_url: proofUrl
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // Generate refund slip PDF for lab cancellations
      if (refundData.refundType === 'lab' && selectedOrder) {
        const patient = selectedOrder.patient;
        const items = selectedItems.length > 0 ? selectedItems : selectedOrder.lab_pathology_order_items || [];
        try {
          await generateRefundSlipPDF({
            refundNumber: refund.id.slice(0, 8).toUpperCase(),
            patientName: patient ? `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim() : 'N/A',
            patientNumber: patient?.patient_number || 'N/A',
            patientContact: patient?.profile?.phone || null,
            orderNumber: selectedOrder.order_number,
            items: items.map(item => ({
              testName: item.test_name_snapshot,
              price: Number(item.price || 0)
            })),
            totalAmount: items.reduce((sum, item) => sum + Number(item.price || 0), 0),
            refundAmount: parseFloat(refundData.amount),
            reason: refundData.description,
            processedBy: profile ? `${profile.first_name} ${profile.last_name}` : 'N/A',
            date: format(new Date(), 'dd/MM/yyyy hh:mm a')
          });
        } catch (pdfError) {
          console.error('Error generating refund slip:', pdfError);
        }
      }

      const doctorName = refundData.doctorId ? 
        `Dr. ${doctors?.find(d => d.id === refundData.doctorId)?.first_name} ${doctors?.find(d => d.id === refundData.doctorId)?.last_name}` : 
        'N/A';
      
      await logCreate(
        'Refund',
        `${getRefundTypeLabel(refundData.refundType)} refund of ${formatPkrAmount(parseFloat(refundData.amount))} processed. Doctor: ${doctorName}. Description: ${refundData.description}`,
        profile?.id
      );

      return refund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      queryClient.invalidateQueries({ queryKey: ['financial-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setFormData({ amount: "", refundType: "", description: "", doctorId: "" });
      setSelectedOrder(null);
      setOrderSearch("");
      setShowConfirmDialog(false);
      setProofFile(null);
      toast.success("Test cancelled and refund processed successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to process refund");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.refundType || !formData.description) {
      toast.error("Please fill all required fields");
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    // If refund type is consultation or ot_doctor, doctor must be selected
    if ((formData.refundType === 'consultation' || formData.refundType === 'ot_doctor') && !formData.doctorId) {
      toast.error("Please select a doctor for consultation or OT Doctor refunds");
      return;
    }

    // If refund type is lab, an order must be selected
    if (formData.refundType === 'lab' && !selectedOrder) {
      toast.error("Please select a pathology order to cancel");
      return;
    }

    if (!proofFile) {
      toast.error("Please attach a receipt/proof");
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmRefund = () => {
    createRefundMutation.mutate(formData);
  };

  const getRefundTypeLabel = (type: string) => {
    const labels = {
      consultation: "Consultation",
      ot_doctor: "OT Doctor", 
      ot_simple: "OT Simple",
      lab: "Lab Report",
      pharmacy: "Pharmacy",
      other: "Other Hospital Services"
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getRefundTypeColor = (type: string) => {
    const colors = {
      consultation: "bg-blue-100 text-blue-800",
      ot_doctor: "bg-red-100 text-red-800",
      ot_simple: "bg-orange-100 text-orange-800", 
      lab: "bg-green-100 text-green-800",
      pharmacy: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const isDoctorRelated = (type: string) => ['consultation', 'ot_doctor'].includes(type);

  return (
    <div className="space-y-6">
      {/* Create Refund Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Process Refund
          </CardTitle>
          <CardDescription>
            Process refunds for consultations, operations, lab reports, pharmacy, and other services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Refund Amount (PKR) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Refund Type *</Label>
                <Select 
                  value={formData.refundType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, refundType: value, doctorId: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refund type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">Consultation</SelectItem>
                    <SelectItem value="ot_doctor">OT Doctor</SelectItem>
                    <SelectItem value="ot_simple">OT Simple</SelectItem>
                    <SelectItem value="lab">Lab Report</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="other">Other Hospital Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isDoctorRelated(formData.refundType) && (
                <div className="space-y-2">
                  <Label>Select Doctor *</Label>
                  <Select 
                    value={formData.doctorId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, doctorId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors?.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          Dr. {doctor.first_name} {doctor.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.refundType === 'lab' && (
                <div className="space-y-2">
                  <Label>Find Order</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Order number (PATH-######) or invoice number (PATH-INV-...)"
                      value={orderSearch}
                      onChange={(e) => {
                        setOrderSearch(e.target.value);
                        if (selectedOrder) clearLabSelection();
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && lookupPathologyOrder()}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={lookupPathologyOrder} disabled={searchingOrders}>
                      <Search className="w-4 h-4 mr-2" />
                      {searchingOrders ? "Searching..." : "Lookup"}
                    </Button>
                    {selectedOrder && (
                      <Button type="button" variant="ghost" size="icon" onClick={clearLabSelection}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter refund reason and details"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Receipt / Proof <span className="text-destructive">*</span></Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {proofFile ? proofFile.name : 'Attach Receipt'}
                </Button>
                {proofFile && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProofFile(null)} className="text-destructive text-xs">Remove</Button>
                )}
              </div>
              {!proofFile && <p className="text-xs text-destructive mt-1">Proof attachment is required</p>}
            </div>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button type="submit" className="w-full" disabled={createRefundMutation.isPending || uploadingProof}>
                  {uploadingProof ? "Uploading proof..." : createRefundMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing Refund...
                    </>
                  ) : (
                    "Process Refund"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Refund</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>Are you sure you want to process this refund?</p>
                    <div className="bg-gray-50 p-3 rounded space-y-1 text-sm">
                      <p><strong>Amount:</strong> {formatPkrAmount(parseFloat(formData.amount || "0"))}</p>
                      <p><strong>Type:</strong> {getRefundTypeLabel(formData.refundType)}</p>
                      {isDoctorRelated(formData.refundType) && formData.doctorId && (
                        <p><strong>Doctor:</strong> Dr. {doctors?.find(d => d.id === formData.doctorId)?.first_name} {doctors?.find(d => d.id === formData.doctorId)?.last_name}</p>
                      )}
                      <p><strong>Impact:</strong> {isDoctorRelated(formData.refundType) ? "This will be deducted from doctor's revenue" : "This will be deducted from hospital revenue"}</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmRefund} className="bg-red-600 hover:bg-red-700">
                    Confirm Refund
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </CardContent>
      </Card>

      {/* Lab Order Details & Test Selection (like pharmacy pattern) */}
      {selectedOrder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <span>Order {selectedOrder.order_number}</span>
              <Badge variant="secondary">{selectedOrder.lab_pathology_order_items?.length || 0} tests</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
              <div>
                <p className="text-gray-500">Patient</p>
                <p className="font-medium">
                  {selectedOrder.patient?.profile?.first_name} {selectedOrder.patient?.profile?.last_name}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Patient ID</p>
                <p className="font-medium">{selectedOrder.patient?.patient_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <p className="font-medium capitalize">{selectedOrder.lab_status}</p>
              </div>
              <div>
                <p className="text-gray-500">Payment</p>
                <p className="font-medium capitalize">{selectedOrder.payment_status}</p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Select</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder.lab_pathology_order_items?.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedTestIds.has(item.id)}
                        onChange={() => toggleTestItem(item.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.test_name_snapshot}</TableCell>
                    <TableCell className="text-right font-mono">
                      Rs. {Number(item.price || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator />

            <div className="space-y-1 text-sm max-w-sm ml-auto">
              <div className="flex justify-between">
                <span className="text-gray-600">Selected tests:</span>
                <span>{selectedItems.length} / {selectedOrder.lab_pathology_order_items?.length || 0}</span>
              </div>
              {isDiscounted && (
                <>
                  <div className="flex justify-between text-gray-500">
                    <span>Catalog total:</span>
                    <span className="line-through">{formatPkrAmount(selectedCatalog)}</span>
                  </div>
                  <div className="text-xs text-amber-600">
                    Discount applied to this invoice — refund reflects the amount actually paid.
                  </div>
                </>
              )}
              <div className="flex justify-between text-lg font-bold pt-1 border-t">
                <span>Refund amount:</span>
                <span className="text-green-600">{formatPkrAmount(labRefundAmount)}</span>
              </div>
            </div>

            <AlertDialog open={showLabConfirm} onOpenChange={setShowLabConfirm}>
              <AlertDialogTrigger asChild>
                <Button
                  className="w-full"
                  disabled={selectedItems.length === 0}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Cancel Selected Tests & Refund
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Test Cancellation</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>
                        Cancel <strong>{selectedItems.length} test(s)</strong> and refund{" "}
                        <strong>{formatPkrAmount(labRefundAmount)}</strong> against order{" "}
                        <strong>{selectedOrder.order_number}</strong>?
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {selectedItems.map(item => (
                          <li key={item.id}>{item.test_name_snapshot} — {formatPkrAmount(Number(item.price))}</li>
                        ))}
                      </ul>
                      <div className="text-sm border-t pt-2">
                        <Label>Reason for cancellation</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter cancellation reason"
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setFormData(prev => ({ ...prev, amount: labRefundAmount.toString() }));
                      setShowConfirmDialog(true);
                      setShowLabConfirm(false);
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Confirm Cancellation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Refunds History */}
      <Card>
        <CardHeader>
          <CardTitle>Refunds History</CardTitle>
          <CardDescription>
            All processed refunds and their impact on revenue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Start Date */}
                <div>
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* End Date */}
                <div>
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-2",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Search */}
                <div>
                  <Label>Search</Label>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search refunds..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="mt-2 w-full"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="text-sm text-gray-600">
            Total refunds: <span className="font-semibold">{refunds?.length || 0}</span>
            {(startDate || endDate || searchTerm) && (
              <span className="ml-2">
                (Filtered: <span className="font-semibold">{filteredRefunds.length}</span>)
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading refunds...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Proof</TableHead>
                      <TableHead>Processed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRefunds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          {refunds?.length === 0 
                            ? "No refunds processed yet" 
                            : "No refunds found for the selected filters"
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRefunds.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell>
                            {format(new Date(refund.created_at), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatPkrAmount(refund.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRefundTypeColor(refund.refund_type)}>
                              {getRefundTypeLabel(refund.refund_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {refund.doctor ? (
                              `Dr. ${refund.doctor.first_name} ${refund.doctor.last_name}`
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {refund.description}
                          </TableCell>
                          <TableCell>
                            {refund.proof_url ? (
                              <a href={refund.proof_url} target="_blank" rel="noopener noreferrer">
                                <Badge variant="secondary" className="flex items-center gap-1 cursor-pointer hover:bg-primary/10">
                                  <ImageIcon className="w-3 h-3" /> View
                                </Badge>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {refund.processed_by_profile.first_name} {refund.processed_by_profile.last_name}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredRefunds.length)} of {filteredRefunds.length} refunds
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}