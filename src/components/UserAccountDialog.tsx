import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDepartments } from '@/hooks/useDatabase';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus } from 'lucide-react';

export default function UserAccountDialog() {
  const { createUserAccount } = useAuth();
  const { data: departments } = useDepartments();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: '',
    department_id: '',
    specialization: '',
    license_number: '',
    consultation_fee: 0,
    degrees: '',
    pa_phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, data: userId } = await createUserAccount({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        phone: formData.phone || undefined,
        department_id: formData.department_id || undefined,
      });

      if (error) {
        toast({
          title: 'Failed to Create Account',
          description: error.message || 'An error occurred while creating the account',
          variant: 'destructive',
        });
        return;
      }

      if (formData.role === 'doctor' && userId) {
        const doctorUpdate: Record<string, any> = {};
        if (formData.specialization) doctorUpdate.specialization = formData.specialization;
        if (formData.license_number) doctorUpdate.license_number = formData.license_number;
        if (formData.consultation_fee > 0) doctorUpdate.consultation_fee = formData.consultation_fee;
        const template: Record<string, any> = {};
        if (formData.degrees) template.degrees = formData.degrees;
        if (formData.pa_phone) template.pa_phone = formData.pa_phone;
        if (Object.keys(template).length > 0) doctorUpdate.prescription_template = template;

        if (Object.keys(doctorUpdate).length > 0) {
          const { error: docError } = await supabase
            .from('doctors')
            .update(doctorUpdate as any)
            .eq('id', userId);

          if (docError) {
            console.error('Error updating doctor record:', docError);
          }
        }
      }

      toast({
        title: 'Account Created',
        description: `Successfully created ${formData.role} account for ${formData.email}`,
      });
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role: '',
        department_id: '',
        specialization: '',
        license_number: '',
        consultation_fee: 0,
        degrees: '',
        pa_phone: ''
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Create User Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User Account</DialogTitle>
          <DialogDescription>
            Create accounts for staff, doctors, pharmacy, and finance users.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
                <SelectItem value="ipd">IPD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="department">Department (Optional)</Label>
            <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.role === 'doctor' && (
            <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
              <h4 className="font-medium text-sm">Doctor Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc_specialization">Specialization</Label>
                  <Input
                    id="doc_specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g., Cardiology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc_license">License Number</Label>
                  <Input
                    id="doc_license"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
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
                    value={formData.consultation_fee}
                    onChange={(e) => setFormData({ ...formData, consultation_fee: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 2000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc_pa_phone">PA Phone</Label>
                  <Input
                    id="doc_pa_phone"
                    value={formData.pa_phone}
                    onChange={(e) => setFormData({ ...formData, pa_phone: e.target.value })}
                    placeholder="PA clinic phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc_degrees">Degrees</Label>
                <Input
                  id="doc_degrees"
                  value={formData.degrees}
                  onChange={(e) => setFormData({ ...formData, degrees: e.target.value })}
                  placeholder="MBBS, FCPS, CHPE"
                />
              </div>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
