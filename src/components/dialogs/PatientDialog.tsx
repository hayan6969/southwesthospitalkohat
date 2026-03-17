
import { useState } from "react";
import { useCreatePatientWithProfile } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const PAKISTAN_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad",
  "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala",
  "Hyderabad", "Bahawalpur", "Sargodha", "Abbottabad", "Mardan",
  "Sukkur", "Larkana", "Sahiwal", "Jhang", "Rahim Yar Khan",
  "Sheikhupura", "Gujrat", "Kasur", "Dera Ghazi Khan", "Muzaffarabad",
  "Mirpur", "Chitral", "Swat", "Mansehra", "Jhelum",
  "Other"
];

export function PatientDialog() {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");

  const createPatientWithProfile = useCreatePatientWithProfile();
  const { logAction } = useAuditLogger();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !cnic.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const patientData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        cnic: cnic.trim(),
      };
      
      console.log('Attempting to register patient:', { 
        name: `${firstName} ${lastName}`, 
        phone: phone.trim() 
      });
      
      const result = await createPatientWithProfile.mutateAsync(patientData);
      
      console.log('Patient registration successful:', result);
      
      // Log the audit event
      await logAction(
        "Registered new patient",
        `Patient: ${firstName} ${lastName} (Phone: ${phone}, CNIC: ${cnic})`
      );
      
      // Show success message with patient details
      const successMessage = result.patientNumber 
        ? `Patient registered successfully!\nPatient ID: ${result.patientNumber}\nPhone: ${phone}\nThey can now login with their phone number and CNIC.`
        : `Patient registered successfully!\nPhone: ${phone}\nThey can now login with their phone number and CNIC.`;
      
      toast.success(successMessage, { duration: 6000 });
      setOpen(false);
      
      // Reset form
      setFirstName("");
      setLastName("");
      setPhone("");
      setCnic("");
    } catch (error: any) {
      console.error("Error creating patient:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        details: error.details
      });
      
      if (error.message === 'DUPLICATE_PHONE') {
        toast.error(`This phone number (${phone}) is already registered. Each patient must have a unique phone number.`, { duration: 5000 });
      } else if (error.message.includes('USER_CREATION_FAILED') && error.message.includes('already exists')) {
        toast.error(`This phone number (${phone}) is already registered. Each patient must have a unique phone number.`, { duration: 5000 });
      } else if (error.message.includes('USER_CREATION_FAILED')) {
        toast.error(`Failed to create user account: ${error.message.replace('USER_CREATION_FAILED: ', '')}`);
      } else if (error.message.includes('PATIENT_CREATION_FAILED')) {
        toast.error(`Failed to create patient record: ${error.message.replace('PATIENT_CREATION_FAILED: ', '')}`);
      } else if (error.message.includes('REGISTRATION_FAILED')) {
        toast.error(`Registration failed: ${error.message.replace('REGISTRATION_FAILED: ', '')}`);
      } else {
        toast.error(`Registration error: ${error.message || 'Unknown error occurred'}. Please try again.`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Register Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number * (Used as Username)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03001234567"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnic">CNIC * (Used as Password)</Label>
            <Input
              id="cnic"
              value={cnic}
              onChange={(e) => setCnic(e.target.value)}
              placeholder="12345-6789012-3"
              required
            />
          </div>
          
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p>• <strong>Phone number:</strong> Used as username for login (must be unique per patient)</p>
            <p>• <strong>CNIC:</strong> Used as password for login (can be shared by family members)</p>
            <p>• <strong>Patient Number:</strong> Auto-generated unique identifier</p>
            <p>• Multiple family members can use the same CNIC but need different phone numbers</p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPatientWithProfile.isPending}>
              {createPatientWithProfile.isPending ? "Registering..." : "Register Patient"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
