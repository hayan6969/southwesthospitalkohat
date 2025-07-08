
import { useState } from "react";
import { useCreateInvoice, usePatients } from "@/hooks/useDatabase";
import { usePatientNames, getPatientName } from "@/hooks/useDisplayHelpers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { convertUsdToPkr } from "@/utils/currency";
import { generateInvoicePDF } from "@/utils/pdfGenerator";

export function InvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const createInvoice = useCreateInvoice();
  const { data: patients } = usePatients();
  const { data: patientNames } = usePatientNames();

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${timestamp}`;
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
      // Convert PKR to USD for storage
      const usdAmount = amountNumber / convertUsdToPkr(1);
      const invoiceNumber = generateInvoiceNumber();
      
      const newInvoice = await createInvoice.mutateAsync({
        patient_id: patientId,
        invoice_number: invoiceNumber,
        amount: usdAmount,
        description: description.trim(),
        due_date: dueDate || undefined,
        status: 'pending'
      });
      
      toast.success("Invoice created successfully");
      
      // Generate and open PDF invoice
      const selectedPatient = patients?.find(p => p.id === patientId);
      const patientName = getPatientName(patientId, patientNames || []);
      
      const invoiceData = {
        invoice_number: invoiceNumber,
        created_at: new Date().toISOString(),
        amount: amountNumber, // Use original PKR amount for display
        description: description.trim(),
        due_date: dueDate,
        status: 'pending',
        patient: {
          users: {
            first_name: patientName.split(' ')[0] || '',
            last_name: patientName.split(' ').slice(1).join(' ') || '',
            email: ''
          }
        }
      };
      
      generateInvoicePDF(invoiceData);
      
      setOpen(false);
      
      // Reset form
      setPatientId("");
      setAmount("");
      setDescription("");
      setDueDate("");
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Patient</Label>
            <Select value={patientId} onValueChange={setPatientId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {getPatientName(patient.id, patientNames || [])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
