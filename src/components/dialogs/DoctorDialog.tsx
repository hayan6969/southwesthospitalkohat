
import { useState } from "react";
import { useCreateDoctor, useDepartments } from "@/hooks/useDatabase";
import { useAuditLogger } from "@/hooks/useAuditLogger";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function DoctorDialog() {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const createDoctor = useCreateDoctor();
  const { data: departments } = useDepartments();
  const { logAction } = useAuditLogger();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !specialization.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createDoctor.mutateAsync({
        user: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          role: 'doctor',
          department_id: departmentId || undefined
        },
        specialization: specialization.trim(),
        license_number: licenseNumber.trim() || undefined,
        experience_years: experienceYears ? parseInt(experienceYears) : undefined
      });
      
      // Log the audit event
      await logAction(
        "Created doctor",
        `Dr. ${firstName.trim()} ${lastName.trim()} - ${specialization.trim()}`
      );
      
      toast.success("Doctor created successfully");
      setOpen(false);
      
      // Reset form
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSpecialization("");
      setLicenseNumber("");
      setExperienceYears("");
      setDepartmentId("");
    } catch (error) {
      toast.error("Failed to create doctor");
      console.error("Error creating doctor:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Doctor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Doctor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g., Cardiology, Pediatrics"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department (Optional)</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number (Optional)</Label>
              <Input
                id="licenseNumber"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="experienceYears">Experience (Years)</Label>
              <Input
                id="experienceYears"
                type="number"
                min="0"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDoctor.isPending}>
              {createDoctor.isPending ? "Creating..." : "Add Doctor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
