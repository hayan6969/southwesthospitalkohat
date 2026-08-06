
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useDatabase";
import { useShifts } from "@/hooks/useShifts";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function AccountManagementDialog() {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [shift, setShift] = useState("");
  const [loading, setLoading] = useState(false);

  // Doctor-only fields (shown when role === 'doctor')
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [consultationFee, setConsultationFee] = useState(0);
  const [degrees, setDegrees] = useState("");
  const [paPhone, setPaPhone] = useState("");
  const [isEyeSpecialist, setIsEyeSpecialist] = useState(false);

  const { createUserAccount, profile: currentProfile } = useAuth();
  const { data: departments } = useDepartments();
  const { data: shifts } = useShifts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim() || !role) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { error, data: userId } = await createUserAccount({
        email: email.trim(),
        password: password.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: role,
        phone: phone.trim() || undefined,
        department_id: departmentId || undefined
      });

      if (error) {
        const msg = error.message || '';
        if (msg.includes('duplicate key') || msg.includes('already been registered') || msg.includes('unique constraint')) {
          toast.error("This email is already registered. Please use a different email address.");
        } else {
          toast.error("Failed to create account: " + msg);
        }
      } else {
        // For doctors, seed/update the doctors row (handle_new_user only creates
        // a profiles row, so we must upsert here — update() would hit zero rows).
        if (role === 'doctor' && userId) {
          const doctorRow: Record<string, any> = { id: userId };
          doctorRow.is_eye_specialist = isEyeSpecialist;
          if (specialization.trim()) doctorRow.specialization = specialization.trim();
          if (licenseNumber.trim()) doctorRow.license_number = licenseNumber.trim();
          if (consultationFee > 0) doctorRow.consultation_fee = consultationFee;
          const template: Record<string, any> = {};
          if (degrees.trim()) template.degrees = degrees.trim();
          if (paPhone.trim()) template.pa_phone = paPhone.trim();
          if (Object.keys(template).length > 0) doctorRow.prescription_template = template;

          const { error: docError } = await supabase
            .from('doctors')
            .upsert(doctorRow as any, { onConflict: 'id' });
          if (docError) {
            toast.error("Account created, but doctor details were not saved: " + docError.message);
          }
        }

        toast.success(`${role} account created successfully for ${firstName} ${lastName}`);
        setOpen(false);

        // Reset form
        setFirstName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setPhone("");
        setRole("");
        setDepartmentId("");
        setShift("");
        setSpecialization("");
        setLicenseNumber("");
        setConsultationFee(0);
        setDegrees("");
        setPaPhone("");
      }
    } catch (error) {
      toast.error("Failed to create account");
      console.error("Error creating account:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(password);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={setRole} required>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-white z-[10000] max-h-[200px]" position="popper" side="bottom" portal={false}>
                {currentProfile?.role === 'super_admin' && (
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                )}
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="ota">OTA</SelectItem>
                <SelectItem value="ipd">IPD</SelectItem>
                <SelectItem value="nursing">Nursing</SelectItem>
                <SelectItem value="head_pharmacist">Head Pharmacist</SelectItem>
                <SelectItem value="assistant_pharmacist">Assistant Pharmacist</SelectItem>
                <SelectItem value="salesman_pharmacist">Salesman Pharmacist</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                <SelectItem value="store">Store</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={generatePassword}>
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {role === 'doctor' && (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <h4 className="font-medium text-sm">Doctor Details (prescription slip)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc_specialization">Specialization</Label>
                  <Input
                    id="doc_specialization"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g., Consultant Gynaecologist"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc_license">License / PMDC #</Label>
                  <Input
                    id="doc_license"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="PMDC / License #"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc_fee">Consultation Fee (PKR)</Label>
                  <Input
                    id="doc_fee"
                    type="number"
                    min="0"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(parseInt(e.target.value) || 0)}
                    placeholder="e.g., 2000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc_pa_phone">PA Phone</Label>
                  <Input
                    id="doc_pa_phone"
                    value={paPhone}
                    onChange={(e) => setPaPhone(e.target.value)}
                    placeholder="0336-1974146"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_degrees">Degrees</Label>
                <Input
                  id="doc_degrees"
                  value={degrees}
                  onChange={(e) => setDegrees(e.target.value)}
                  placeholder="MBBS, FCPS, CHPE"
                />
              </div>
            </div>
          )}

          {['staff', 'nursing', 'ota'].includes(role) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="department">Department {role === 'staff' ? '*' : ''}</Label>
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
              {role === 'staff' && (
                <div className="space-y-2">
                  <Label htmlFor="shift">Shift *</Label>
                  <Select value={shift} onValueChange={setShift}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {shifts?.map((s) => (
                        <SelectItem key={s.id} value={s.name.toLowerCase()}>
                          {s.name} ({s.start_time.slice(0,5)} - {s.end_time.slice(0,5)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
