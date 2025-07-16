import { useState } from "react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { formatPkrAmount } from "@/utils/currency";

export function EmergencyConsultationDialog() {
  const [open, setOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [cnic, setCnic] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { settings: hospitalSettings } = useHospitalSettings();

  const emergencyFee = hospitalSettings?.emergency_consultation_fee || 10000;

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `EMG-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientName.trim() || !cnic.trim() || !contactNumber.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Basic validation for contact number
    if (contactNumber.length < 11) {
      toast.error("Please enter a valid contact number");
      return;
    }

    setIsProcessing(true);

    try {
      const invoiceNumber = generateInvoiceNumber();
      
      // Create invoice for emergency consultation
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          patient_id: '00000000-0000-0000-0000-000000000001', // Default emergency patient ID
          invoice_number: invoiceNumber,
          amount: emergencyFee,
          description: `Emergency Consultation - ${patientName}`,
          status: 'paid',
          paid_at: new Date().toISOString(),
          due_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate and open PDF
      const invoiceForPDF = {
        ...invoiceData,
        patient: {
          patient_number: 'EMERGENCY',
          users: {
            first_name: patientName.split(' ')[0] || '',
            last_name: patientName.split(' ').slice(1).join(' ') || '',
            email: '',
            phone: contactNumber
          },
          cnic: cnic
        }
      };

      await generateInvoicePDF(invoiceForPDF);
      
      toast.success(`Emergency consultation invoice generated for ${formatPkrAmount(emergencyFee)}`);
      
      setOpen(false);
      
      // Reset form
      setPatientName("");
      setCnic("");
      setContactNumber("");
    } catch (error) {
      console.error('Error creating emergency consultation:', error);
      toast.error("Failed to create emergency consultation invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Emergency
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Emergency Consultation
          </DialogTitle>
        </DialogHeader>
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Emergency Fee:</strong> {formatPkrAmount(emergencyFee)}
          </p>
          <p className="text-xs text-red-600 mt-1">
            This amount will be added to hospital revenue immediately.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patientName">Patient Name *</Label>
            <Input
              id="patientName"
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Enter patient full name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnic">CNIC *</Label>
            <Input
              id="cnic"
              type="text"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number *</Label>
            <Input
              id="contactNumber"
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="03XXXXXXXXX"
              required
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing} variant="destructive">
              {isProcessing ? "Processing..." : `Generate Invoice (${formatPkrAmount(emergencyFee)})`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}