
import { useState, useMemo } from "react";
import { useCreatePatientWithProfile } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
import { ALL_PROVINCES, getCitiesForProvince } from "@/utils/pakistanCities";

export function PatientDialog() {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [cnic, setCnic] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const createPatientWithProfile = useCreatePatientWithProfile();
  const { logAction } = useAuditLogger();

  const availableCities = useMemo(() => {
    const cities = getCitiesForProvince(province);
    if (!citySearch.trim()) return cities;
    return cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));
  }, [province, citySearch]);

  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setCity("");
    setCitySearch("");
  };

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
        province: province || undefined,
        city: city || undefined,
      };
      
      const result = await createPatientWithProfile.mutateAsync(patientData);
      
      await logAction(
        "Registered new patient",
        `Patient: ${firstName} ${lastName} (Phone: ${phone}, CNIC: ${cnic})`
      );
      
      const successMessage = result.patientNumber 
        ? `Patient registered successfully!\nPatient ID: ${result.patientNumber}\nPhone: ${phone}\nThey can now login with their phone number and CNIC.`
        : `Patient registered successfully!\nPhone: ${phone}\nThey can now login with their phone number and CNIC.`;
      
      toast.success(successMessage, { duration: 6000 });
      setOpen(false);
      
      setFirstName("");
      setLastName("");
      setPhone("");
      setCnic("");
      setProvince("");
      setCity("");
      setCitySearch("");
    } catch (error: any) {
      console.error("Error creating patient:", error);
      
      if (error.message === 'DUPLICATE_PHONE') {
        toast.error(`This phone number (${phone}) is already registered. Each patient must have a unique phone number.`, { duration: 5000 });
      } else if (error.message.includes('USER_CREATION_FAILED') && error.message.includes('already exists')) {
        toast.error(`This phone number (${phone}) is already registered.`, { duration: 5000 });
      } else if (error.message.includes('USER_CREATION_FAILED')) {
        toast.error(`Failed to create user account: ${error.message.replace('USER_CREATION_FAILED: ', '')}`);
      } else if (error.message.includes('PROFILE_CREATION_FAILED')) {
        toast.error(`Failed to create patient profile: ${error.message.replace('PROFILE_CREATION_FAILED: ', '')}`);
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Province</Label>
              <Select value={province} onValueChange={handleProvinceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent portal={false} className="z-[9999]">
                  {ALL_PROVINCES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Select value={city} onValueChange={setCity} disabled={!province}>
                <SelectTrigger>
                  <SelectValue placeholder={province ? "Select city" : "Select province first"} />
                </SelectTrigger>
                <SelectContent portal={false} className="z-[9999] max-h-[200px]">
                  <div className="px-2 pb-2 sticky top-0 bg-popover">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search city..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        className="h-8 pl-7 text-sm"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  {availableCities.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-2">No cities found</div>
                  ) : (
                    availableCities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
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
