import { useState } from "react";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateInvoicePDF } from "@/utils/pdfGenerator";
import { formatPkrAmount } from "@/utils/currency";
import { useQuery } from "@tanstack/react-query";

interface AdditionalExpense {
  id: string;
  name: string;
  cost: number;
}

interface EmergencyExpense {
  id: string;
  name: string;
  cost: number;
  selected?: boolean;
}

export function EmergencyConsultationDialog() {
  const [open, setOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [cnic, setCnic] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [additionalExpenses, setAdditionalExpenses] = useState<AdditionalExpense[]>([]);
  const [selectedEmergencyExpenses, setSelectedEmergencyExpenses] = useState<EmergencyExpense[]>([]);
  const [includeDoctorFee, setIncludeDoctorFee] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { settings: hospitalSettings } = useHospitalSettings();

  // Fetch emergency expenses from admin
  const { data: emergencyExpenses = [] } = useQuery({
    queryKey: ['emergency-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_expenses')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as EmergencyExpense[];
    }
  });

  const emergencyFee = hospitalSettings?.emergency_consultation_fee || 10000;
  const doctorFee = includeDoctorFee ? emergencyFee : 0;
  const totalAdditionalCost = additionalExpenses.reduce((sum, expense) => sum + expense.cost, 0);
  const totalSelectedEmergencyExpenses = selectedEmergencyExpenses.reduce((sum, expense) => sum + expense.cost, 0);
  const grandTotal = doctorFee + totalAdditionalCost + totalSelectedEmergencyExpenses;

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `EMG-${timestamp}`;
  };

  const addAdditionalExpense = () => {
    const newExpense: AdditionalExpense = {
      id: Date.now().toString(),
      name: "",
      cost: 0
    };
    setAdditionalExpenses([...additionalExpenses, newExpense]);
  };

  const removeAdditionalExpense = (id: string) => {
    setAdditionalExpenses(additionalExpenses.filter(expense => expense.id !== id));
  };

  const updateAdditionalExpense = (id: string, field: 'name' | 'cost', value: string | number) => {
    setAdditionalExpenses(additionalExpenses.map(expense => 
      expense.id === id ? { ...expense, [field]: value } : expense
    ));
  };

  const toggleEmergencyExpense = (expense: EmergencyExpense) => {
    const isSelected = selectedEmergencyExpenses.some(sel => sel.id === expense.id);
    if (isSelected) {
      setSelectedEmergencyExpenses(selectedEmergencyExpenses.filter(sel => sel.id !== expense.id));
    } else {
      setSelectedEmergencyExpenses([...selectedEmergencyExpenses, expense]);
    }
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
      
      // Create detailed description including all expenses
      let description = `Emergency Consultation - ${patientName}`;
      
      // Add doctor fee if included
      if (includeDoctorFee) {
        description += ` | Doctor Fee: ${formatPkrAmount(emergencyFee)}`;
      }
      
      // Add emergency expenses
      if (selectedEmergencyExpenses.length > 0) {
        const emergencyDetails = selectedEmergencyExpenses
          .map(exp => `${exp.name}: ${formatPkrAmount(exp.cost)}`)
          .join(', ');
        description += ` | Emergency Services: ${emergencyDetails}`;
      }
      
      // Add additional expenses
      if (additionalExpenses.length > 0) {
        const expenseDetails = additionalExpenses
          .filter(exp => exp.name.trim() && exp.cost > 0)
          .map(exp => `${exp.name}: ${formatPkrAmount(exp.cost)}`)
          .join(', ');
        if (expenseDetails) {
          description += ` | Additional: ${expenseDetails}`;
        }
      }
      
      // Create invoice for emergency consultation with total amount
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          patient_id: '00000000-0000-0000-0000-000000000001', // Default emergency patient ID
          invoice_number: invoiceNumber,
          amount: grandTotal,
          description: description,
          status: 'paid',
          paid_at: new Date().toISOString(),
          due_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Generate and open PDF with actual patient data
      const invoiceForPDF = {
        ...invoiceData,
        patient: {
          patient_number: 'EMERGENCY',
          profiles: {
            first_name: patientName.split(' ')[0] || '',
            last_name: patientName.split(' ').slice(1).join(' ') || '',
            email: '',
            phone: contactNumber
          },
          cnic: cnic
        },
        // Store actual emergency patient data for PDF generation
        emergency_patient_data: {
          name: patientName,
          cnic: cnic,
          phone: contactNumber
        }
      };

      await generateInvoicePDF(invoiceForPDF);
      
      toast.success(`Emergency consultation invoice generated for ${formatPkrAmount(grandTotal)}`);
      
      setOpen(false);
      
      // Reset form
      setPatientName("");
      setCnic("");
      setContactNumber("");
      setAdditionalExpenses([]);
      setSelectedEmergencyExpenses([]);
      setIncludeDoctorFee(false);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Emergency Consultation
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto px-1">
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="space-y-2">
              {includeDoctorFee && (
                <div className="flex justify-between text-sm text-red-800">
                  <span>Doctor Fee:</span>
                  <span className="font-medium">{formatPkrAmount(emergencyFee)}</span>
                </div>
              )}
              {selectedEmergencyExpenses.map(expense => (
                <div key={expense.id} className="flex justify-between text-sm text-red-700">
                  <span className="truncate mr-2">{expense.name}:</span>
                  <span className="flex-shrink-0">{formatPkrAmount(expense.cost)}</span>
                </div>
              ))}
              {additionalExpenses.filter(exp => exp.name.trim() && exp.cost > 0).map(expense => (
                <div key={expense.id} className="flex justify-between text-sm text-red-700">
                  <span className="truncate mr-2">{expense.name}:</span>
                  <span className="flex-shrink-0">{formatPkrAmount(expense.cost)}</span>
                </div>
              ))}
              {(totalSelectedEmergencyExpenses > 0 || totalAdditionalCost > 0) && (
                <div className="flex justify-between text-sm text-red-800 border-t pt-2">
                  <span>Services & Expenses:</span>
                  <span className="font-medium">{formatPkrAmount(totalSelectedEmergencyExpenses + totalAdditionalCost)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-red-900 border-t pt-2">
                <span>Total Amount:</span>
                <span>{formatPkrAmount(grandTotal)}</span>
              </div>
            </div>
            <p className="text-xs text-red-600 mt-2">
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

            {/* Doctor Fee Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeDoctorFee"
                checked={includeDoctorFee}
                onCheckedChange={(checked) => setIncludeDoctorFee(checked as boolean)}
              />
              <Label 
                htmlFor="includeDoctorFee" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include Doctor Fee ({formatPkrAmount(emergencyFee)})
              </Label>
            </div>

            {/* Emergency Expenses Section */}
            {emergencyExpenses.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Emergency Services</Label>
                <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-3">
                  {emergencyExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`emergency-${expense.id}`}
                        checked={selectedEmergencyExpenses.some(sel => sel.id === expense.id)}
                        onCheckedChange={() => toggleEmergencyExpense(expense)}
                      />
                      <Label 
                        htmlFor={`emergency-${expense.id}`}
                        className="text-sm flex-1 flex justify-between"
                      >
                        <span>{expense.name}</span>
                        <span className="font-medium">{formatPkrAmount(expense.cost)}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Expenses Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Additional Expenses</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAdditionalExpense}
                  className="h-8 px-3"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {additionalExpenses.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-2 border rounded-md p-3">
                  {additionalExpenses.map((expense) => (
                    <div key={expense.id} className="flex gap-3 items-center">
                      <Input
                        placeholder="Expense name"
                        value={expense.name}
                        onChange={(e) => updateAdditionalExpense(expense.id, 'name', e.target.value)}
                        className="flex-1 min-w-0"
                      />
                      <Input
                        type="number"
                        placeholder="Cost"
                        value={expense.cost || ''}
                        onChange={(e) => updateAdditionalExpense(expense.id, 'cost', parseFloat(e.target.value) || 0)}
                        className="w-24"
                        min="0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAdditionalExpense(expense.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isProcessing} 
            variant="destructive"
            onClick={handleSubmit}
            className="min-w-0"
          >
            <span className="hidden sm:inline">
              {isProcessing ? "Processing..." : `Generate Invoice (${formatPkrAmount(grandTotal)})`}
            </span>
            <span className="sm:hidden">
              {isProcessing ? "Processing..." : `Generate (${formatPkrAmount(grandTotal)})`}
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}