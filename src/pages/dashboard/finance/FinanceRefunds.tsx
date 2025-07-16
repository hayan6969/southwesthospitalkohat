import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPkrAmount } from "@/utils/currency";
import { RefreshCw, Plus } from "lucide-react";

interface RefundFormData {
  amount: string;
  refundType: string;
  description: string;
  doctorId?: string;
}

export default function FinanceRefunds() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<RefundFormData>({
    amount: "",
    refundType: "",
    description: "",
    doctorId: ""
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  // Create refund mutation
  const createRefundMutation = useMutation({
    mutationFn: async (refundData: RefundFormData) => {
      // First, create the refund record
      const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .insert({
          amount: parseFloat(refundData.amount),
          refund_type: refundData.refundType,
          description: refundData.description,
          doctor_id: refundData.doctorId || null,
          processed_by: profile?.id
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // If it's a hospital-related refund, also create an expense record
      if (['ot_simple', 'lab', 'pharmacy', 'other'].includes(refundData.refundType)) {
        const { error: expenseError } = await supabase
          .from('expenses')
          .insert({
            amount: parseFloat(refundData.amount),
            category: 'Refund',
            description: `${getRefundTypeLabel(refundData.refundType)} refund: ${refundData.description}`,
            expense_date: new Date().toISOString().split('T')[0],
            created_by: profile?.id
          });

        if (expenseError) throw expenseError;
      }

      return refund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      queryClient.invalidateQueries({ queryKey: ['financial-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] }); // Also invalidate expenses
      setFormData({ amount: "", refundType: "", description: "", doctorId: "" });
      setShowConfirmDialog(false);
      toast.success("Refund processed successfully");
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

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <AlertDialogTrigger asChild>
                <Button type="submit" className="w-full" disabled={createRefundMutation.isPending}>
                  {createRefundMutation.isPending ? (
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

      {/* Refunds History */}
      <Card>
        <CardHeader>
          <CardTitle>Refunds History</CardTitle>
          <CardDescription>
            All processed refunds and their impact on revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading refunds...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Processed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No refunds processed yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    refunds?.map((refund) => (
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
                          {refund.processed_by_profile.first_name} {refund.processed_by_profile.last_name}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}