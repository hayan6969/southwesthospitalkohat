import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Gift, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CheckFreeDialogProps {
  children?: React.ReactNode;
}

export function CheckFreeDialog({ children }: CheckFreeDialogProps) {
  const [open, setOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleSearch = async () => {
    if (!invoiceNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter an invoice number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Find the invoice and related appointment
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('invoice_number', invoiceNumber.trim())
        .single();

      if (invoiceError || !invoice) {
        toast({
          title: "Invoice Not Found",
          description: "No invoice found with this number",
          variant: "destructive",
        });
        setAppointmentData(null);
        return;
      }

      // Find the related appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(patient_number),
          profiles!inner(first_name, last_name)
        `)
        .eq('patient_id', invoice.patient_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (appointmentError || !appointment) {
        toast({
          title: "Appointment Not Found",
          description: "No appointment found for this invoice",
          variant: "destructive",
        });
        setAppointmentData(null);
        return;
      }

      // Get doctor name
      const { data: doctorProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', appointment.doctor_id)
        .single();

      const enrichedAppointment = {
        ...appointment,
        invoice,
        doctorName: doctorProfile 
          ? `${doctorProfile.first_name} ${doctorProfile.last_name}`
          : 'Unknown Doctor'
      };

      setAppointmentData(enrichedAppointment);

    } catch (error) {
      console.error('Error searching appointment:', error);
      toast({
        title: "Error",
        description: "Failed to search appointment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!appointmentData) return;

    setClearing(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ cleared_at: new Date().toISOString() })
        .eq('id', appointmentData.id);

      if (error) throw error;

      toast({
        title: "Appointment Cleared",
        description: "This appointment has been marked as cleared",
      });

      // Update local state
      setAppointmentData({
        ...appointmentData,
        cleared_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error clearing appointment:', error);
      toast({
        title: "Error",
        description: "Failed to clear appointment",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const resetDialog = () => {
    setInvoiceNumber("");
    setAppointmentData(null);
  };

  const isMarkedFree = appointmentData?.invoice?.amount === 0 || 
                      appointmentData?.invoice?.description?.includes('Free');
  
  const isCleared = appointmentData?.cleared_at;

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Search className="w-4 h-4 mr-2" />
            Check Free
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check Free Appointment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <div className="flex gap-2">
              <Input
                id="invoiceNumber"
                placeholder="Enter invoice number..."
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {appointmentData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Patient:</span>
                    <div>{appointmentData.profiles.first_name} {appointmentData.profiles.last_name}</div>
                  </div>
                  <div>
                    <span className="font-medium">Patient #:</span>
                    <div>{appointmentData.patients.patient_number}</div>
                  </div>
                  <div>
                    <span className="font-medium">Doctor:</span>
                    <div>{appointmentData.doctorName}</div>
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>
                    <div>{new Date(appointmentData.appointment_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <span className="font-medium">Invoice Amount:</span>
                    <div>Rs. {appointmentData.invoice.amount}</div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isCleared ? (
                    <Badge className="bg-green-100 text-green-700 w-fit">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Cleared
                    </Badge>
                  ) : isMarkedFree ? (
                    <div className="space-y-2">
                      <Badge className="bg-yellow-100 text-yellow-700 w-fit">
                        <Gift className="w-3 h-3 mr-1" />
                        Marked Free by Doctor
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={handleClear}
                        disabled={clearing}
                        className="w-full"
                      >
                        {clearing ? 'Clearing...' : 'Clear Appointment'}
                      </Button>
                    </div>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700 w-fit">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Paid Appointment
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}