
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments } from "@/hooks/useDatabase";
import { useShifts } from "@/hooks/useShifts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  department_id?: string;
};

interface EditUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

export function EditUserDialog({ user, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [shift, setShift] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  // Doctor-only fields (shown when role === 'doctor')
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [consultationFee, setConsultationFee] = useState(0);
  const [degrees, setDegrees] = useState("");
  const [paPhone, setPaPhone] = useState("");
  // Full existing template so we merge (not clobber) urdu/credentials/toggles
  const [templateObj, setTemplateObj] = useState<Record<string, any>>({});

  const { data: departments } = useDepartments();
  const { data: shifts } = useShifts();

  useEffect(() => {
    if (user && open) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
      setEmail(user.email);
      setPhone(user.phone || "");
      setRole(user.role);
      setDepartmentId(user.department_id || "");
      setShift((user as any).shift || "");
      setPassword("");

      // Reset then load doctor details when editing a doctor
      setSpecialization("");
      setLicenseNumber("");
      setConsultationFee(0);
      setDegrees("");
      setPaPhone("");
      setTemplateObj({});
      if (user.role === 'doctor') {
        (async () => {
          const { data } = await supabase
            .from('doctors')
            .select('specialization, license_number, consultation_fee, prescription_template')
            .eq('id', user.id)
            .maybeSingle();
          if (data) {
            setSpecialization(data.specialization || "");
            setLicenseNumber(data.license_number || "");
            setConsultationFee(data.consultation_fee || 0);
            const tpl = ((data as any).prescription_template || {}) as Record<string, any>;
            setTemplateObj(tpl);
            setDegrees(tpl.degrees || "");
            setPaPhone(tpl.pa_phone || "");
          }
        })();
      }
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !firstName.trim() || !lastName.trim() || !email.trim() || !role) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          role: role,
          department_id: departmentId || null,
          shift: shift || null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (password.trim()) {
        console.log('Invoking password update function for user:', user.id);
        const { data, error: passwordError } = await supabase.functions.invoke(
          'update-user-password',
          {
            body: {
              userId: user.id,
              password: password.trim()
            }
          }
        );
        
        console.log('Password update response:', { data, error: passwordError });
        
        if (passwordError) {
          console.error('Password update error:', passwordError);
          throw new Error(`Password update failed: ${passwordError.message}`);
        }
      }

      // For doctors, save the doctor row + merge template (preserve urdu/credentials/toggles)
      if (role === 'doctor') {
        const merged: Record<string, any> = { ...templateObj };
        if (degrees.trim()) merged.degrees = degrees.trim(); else delete merged.degrees;
        if (paPhone.trim()) merged.pa_phone = paPhone.trim(); else delete merged.pa_phone;

        const doctorRow: Record<string, any> = {
          id: user.id,
          specialization: specialization.trim() || null,
          license_number: licenseNumber.trim() || null,
          consultation_fee: consultationFee,
          prescription_template: merged,
        };
        const { error: docError } = await supabase
          .from('doctors')
          .upsert(doctorRow as any, { onConflict: 'id' });
        if (docError) {
          toast.error("Profile saved, but doctor details failed: " + docError.message);
        }
      }

      toast.success("Account updated successfully");
      onUserUpdated();
      onOpenChange(false);
      
    } catch (error: any) {
      toast.error("Failed to update account: " + error.message);
      console.error("Error updating account:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
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
              <SelectContent className="bg-white z-50">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="ota">OTA</SelectItem>
                <SelectItem value="nursing">Nursing</SelectItem>
                <SelectItem value="head_pharmacist">Head Pharmacist</SelectItem>
                <SelectItem value="assistant_pharmacist">Assistant Pharmacist</SelectItem>
                <SelectItem value="salesman_pharmacist">Salesman Pharmacist</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="inventory_manager">Inventory Manager</SelectItem>
                <SelectItem value="store">Store</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password (leave empty to keep current)</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password or leave empty"
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

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>  
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
              <p className="text-xs text-muted-foreground">
                Urdu header, credentials &amp; toggles are edited by the doctor in their dashboard settings and are preserved here.
              </p>
            </div>
          )}

          {role === 'staff' && (
            <div className="space-y-2">
              <Label htmlFor="shift">Shift</Label>
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

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
