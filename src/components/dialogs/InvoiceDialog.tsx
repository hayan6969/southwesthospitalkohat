
import { useState } from "react";
import { useCreateInvoice } from "@/hooks/useDatabase";
import { useSearchPatientsWithNames, usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, X, User } from "lucide-react";
import { convertUsdToPkr } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";

export function InvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  const createInvoice = useCreateInvoice();
  const { data: patientNames } = usePatientNames();
  const { data: searchResults } = useSearchPatientsWithNames(searchTerm);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${timestamp}`;
  };

  const handleSelectPatient = (patient: any) => {
    setPatientId(patient.id);
    setSelectedPatient(patient);
    setSearchTerm("");
  };

  const handleUnselectPatient = () => {
    setPatientId("");
    setSelectedPatient(null);
    setSearchTerm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId || !amount || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const usdAmount = amountNumber / convertUsdToPkr(1);
      const invoiceNumber = generateInvoiceNumber();
      
      await createInvoice.mutateAsync({
        patient_id: patientId,
        invoice_number: invoiceNumber,
        amount: usdAmount,
        description: description.trim(),
        due_date: dueDate || undefined,
        status: 'pending'
      });
      
      toast.success("Invoice created successfully");
      
      const { data: patientData } = await supabase
        .from('patients')
        .select(`
          patient_number,
          profiles!patients_id_fkey(first_name, last_name, email, phone)
        `)
        .eq('id', patientId)
        .single();
      
      const profileData = patientData?.profiles as any;
      const patientName = profileData
        ? `${profileData.first_name} ${profileData.last_name}`
        : getPatientName(patientId, patientNames || []);
      
      const invoiceData = {
        invoice_number: invoiceNumber,
        created_at: new Date().toISOString(),
        amount: amountNumber,
        description: description.trim(),
        due_date: dueDate,
        status: 'pending',
        patient: {
          patient_number: patientData?.patient_number || 'N/A',
          users: {
            first_name: profileData?.first_name || patientName.split(' ')[0] || '',
            last_name: profileData?.last_name || patientName.split(' ').slice(1).join(' ') || '',
            email: profileData?.email || '',
            phone: profileData?.phone || ''
          }
        }
      };
      
      await generateInvoicePDF(invoiceData);
      
      setOpen(false);
      setPatientId("");
      setSelectedPatient(null);
      setAmount("");
      setDescription("");
      setDueDate("");
      setSearchTerm("");
    } catch (error) {
      toast.error("Failed to create invoice");
      console.error("Error creating invoice:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            {selectedPatient ? (
              <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <User className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {selectedPatient.profile
                      ? `${selectedPatient.profile.first_name} ${selectedPatient.profile.last_name}`
                      : getPatientName(selectedPatient.id, patientNames || [])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.patient_number || 'N/A'}
                    {selectedPatient.profile?.phone ? ` • ${selectedPatient.profile.phone}` : ''}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={handleUnselectPatient}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by name, patient ID, phone, CNIC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoComplete="off"
                />
                {searchTerm.length >= 1 && searchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md z-[10000] max-h-[150px] overflow-y-auto">
                    {searchResults.map((patient: any) => (
                      <button
                        key={patient.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                        onClick={() => handleSelectPatient(patient)}
                      >
                        <span className="font-medium">
                          {patient.profile
                            ? `${patient.profile.first_name} ${patient.profile.last_name}`
                            : 'Unknown'}
                        </span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {patient.patient_number || 'N/A'}
                          {patient.profile?.phone ? ` • ${patient.profile.phone}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {searchTerm.length >= 1 && searchResults && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md z-[10000] p-3 text-sm text-muted-foreground">
                    No patient found.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PKR)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Service description..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoice.isPending}>
              {createInvoice.isPending ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}