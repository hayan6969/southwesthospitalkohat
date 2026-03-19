import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useHospitalSettings } from "@/hooks/useHospitalSettings";
import { useAllShifts, useCreateShift, useUpdateShift, useDeleteShift } from "@/hooks/useShifts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Settings, DollarSign, Clock, Users, Save, Plus, Trash2, Edit2, X, Check } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";
import AppLayout from "@/layouts/AppLayout";

export default function AdminSettings() {
  const { settings, loading, updateSettings, refetch } = useHospitalSettings();
  const { data: shifts, isLoading: shiftsLoading } = useAllShifts();
  const createShift = useCreateShift();
  const updateShift = useUpdateShift();
  const deleteShift = useDeleteShift();

  const [formData, setFormData] = useState({
    hospital_name: "",
    contact_number: "",
    hospital_address: "",
    emergency_consultation_fee: "",
    opening_time: "",
    closing_time: "",
    max_appointments_per_doctor: "",
    booking_lead_time_hours: "",
    emergency_slots_percentage: "",
    payroll_payment_date: "",
  });
  const [saving, setSaving] = useState(false);

  // Shift form state
  const [newShiftName, setNewShiftName] = useState("");
  const [newShiftStart, setNewShiftStart] = useState("08:00");
  const [newShiftEnd, setNewShiftEnd] = useState("14:00");
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editShiftName, setEditShiftName] = useState("");
  const [editShiftStart, setEditShiftStart] = useState("");
  const [editShiftEnd, setEditShiftEnd] = useState("");

  useEffect(() => {
    if (settings) {
      setFormData({
        hospital_name: settings.hospital_name || "",
        contact_number: settings.contact_number || "",
        hospital_address: settings.hospital_address || "",
        emergency_consultation_fee: settings.emergency_consultation_fee?.toString() || "10000",
        opening_time: settings.opening_time || "08:00",
        closing_time: settings.closing_time || "20:00",
        max_appointments_per_doctor: settings.max_appointments_per_doctor?.toString() || "50",
        booking_lead_time_hours: settings.booking_lead_time_hours?.toString() || "2",
        emergency_slots_percentage: settings.emergency_slots_percentage?.toString() || "20",
        payroll_payment_date: settings.payroll_payment_date?.toString() || "1",
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        hospital_name: formData.hospital_name,
        contact_number: formData.contact_number,
        hospital_address: formData.hospital_address,
        emergency_consultation_fee: parseFloat(formData.emergency_consultation_fee),
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        max_appointments_per_doctor: parseInt(formData.max_appointments_per_doctor),
        booking_lead_time_hours: parseInt(formData.booking_lead_time_hours),
        emergency_slots_percentage: parseInt(formData.emergency_slots_percentage),
        payroll_payment_date: parseInt(formData.payroll_payment_date),
      };
      const success = await updateSettings(updateData);
      if (success) refetch();
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateShift = () => {
    if (!newShiftName.trim() || !newShiftStart || !newShiftEnd) {
      toast({ title: "Error", description: "Please fill in all shift fields", variant: "destructive" });
      return;
    }
    createShift.mutate({
      name: newShiftName.trim(),
      start_time: newShiftStart + ":00",
      end_time: newShiftEnd + ":00",
    }, {
      onSuccess: () => {
        setNewShiftName("");
        setNewShiftStart("08:00");
        setNewShiftEnd("14:00");
      }
    });
  };

  const handleEditShift = (shift: any) => {
    setEditingShiftId(shift.id);
    setEditShiftName(shift.name);
    setEditShiftStart(shift.start_time.slice(0, 5));
    setEditShiftEnd(shift.end_time.slice(0, 5));
  };

  const handleSaveEdit = () => {
    if (!editingShiftId) return;
    updateShift.mutate({
      id: editingShiftId,
      name: editShiftName.trim(),
      start_time: editShiftStart + ":00",
      end_time: editShiftEnd + ":00",
    }, {
      onSuccess: () => setEditingShiftId(null),
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Settings className="w-8 h-8" />
              System Settings
            </h1>
            <p className="text-muted-foreground mt-1">Configure hospital settings and operational parameters</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hospital Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Hospital Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hospital_name">Hospital Name</Label>
                <Input id="hospital_name" value={formData.hospital_name} onChange={(e) => handleInputChange("hospital_name", e.target.value)} placeholder="Enter hospital name" />
              </div>
              <div>
                <Label htmlFor="contact_number">Contact Number</Label>
                <Input id="contact_number" value={formData.contact_number} onChange={(e) => handleInputChange("contact_number", e.target.value)} placeholder="Enter contact number" />
              </div>
              <div>
                <Label htmlFor="hospital_address">Hospital Address</Label>
                <Input id="hospital_address" value={formData.hospital_address} onChange={(e) => handleInputChange("hospital_address", e.target.value)} placeholder="Enter hospital address" />
              </div>
            </CardContent>
          </Card>

          {/* Financial Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="emergency_consultation_fee">Emergency Consultation Fee (PKR)</Label>
                <Input id="emergency_consultation_fee" type="number" min="0" step="100" value={formData.emergency_consultation_fee} onChange={(e) => handleInputChange("emergency_consultation_fee", e.target.value)} />
                <p className="text-sm text-muted-foreground mt-1">Current: {formatPkrAmount(parseFloat(formData.emergency_consultation_fee) || 0)}</p>
              </div>
              <div>
                <Label htmlFor="payroll_payment_date">Payroll Payment Date (Day of Month)</Label>
                <Input id="payroll_payment_date" type="number" min="1" max="31" value={formData.payroll_payment_date} onChange={(e) => handleInputChange("payroll_payment_date", e.target.value)} />
                <p className="text-sm text-muted-foreground mt-1">Day of the month when salaries are processed</p>
              </div>
            </CardContent>
          </Card>

          {/* Operating Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Operating Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="opening_time">Opening Time</Label>
                <Input id="opening_time" type="time" value={formData.opening_time} onChange={(e) => handleInputChange("opening_time", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="closing_time">Closing Time</Label>
                <Input id="closing_time" type="time" value={formData.closing_time} onChange={(e) => handleInputChange("closing_time", e.target.value)} />
              </div>
              <div>
                <Label htmlFor="booking_lead_time_hours">Booking Lead Time (Hours)</Label>
                <Input id="booking_lead_time_hours" type="number" min="0" max="48" value={formData.booking_lead_time_hours} onChange={(e) => handleInputChange("booking_lead_time_hours", e.target.value)} />
                <p className="text-sm text-muted-foreground mt-1">Minimum hours before appointment booking</p>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Appointment Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="max_appointments_per_doctor">Max Appointments per Doctor</Label>
                <Input id="max_appointments_per_doctor" type="number" min="1" max="200" value={formData.max_appointments_per_doctor} onChange={(e) => handleInputChange("max_appointments_per_doctor", e.target.value)} />
                <p className="text-sm text-muted-foreground mt-1">Maximum appointments per doctor per day</p>
              </div>
              <div>
                <Label htmlFor="emergency_slots_percentage">Emergency Slots Percentage</Label>
                <Input id="emergency_slots_percentage" type="number" min="0" max="100" value={formData.emergency_slots_percentage} onChange={(e) => handleInputChange("emergency_slots_percentage", e.target.value)} />
                <p className="text-sm text-muted-foreground mt-1">Percentage of slots reserved for emergency appointments</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Shift Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Shift Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create new shift */}
            <div className="flex flex-wrap items-end gap-3 p-4 border rounded-lg bg-muted/30">
              <div className="flex-1 min-w-[150px]">
                <Label>Shift Name</Label>
                <Input value={newShiftName} onChange={(e) => setNewShiftName(e.target.value)} placeholder="e.g. Night" />
              </div>
              <div className="w-[140px]">
                <Label>Start Time</Label>
                <Input type="time" value={newShiftStart} onChange={(e) => setNewShiftStart(e.target.value)} />
              </div>
              <div className="w-[140px]">
                <Label>End Time</Label>
                <Input type="time" value={newShiftEnd} onChange={(e) => setNewShiftEnd(e.target.value)} />
              </div>
              <Button onClick={handleCreateShift} disabled={createShift.isPending} className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Add Shift
              </Button>
            </div>

            {/* Existing shifts */}
            <div className="space-y-2">
              {shiftsLoading ? (
                <p className="text-muted-foreground text-sm">Loading shifts...</p>
              ) : shifts?.length === 0 ? (
                <p className="text-muted-foreground text-sm">No shifts configured. Add one above.</p>
              ) : (
                shifts?.map((shift) => (
                  <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                    {editingShiftId === shift.id ? (
                      <div className="flex flex-wrap items-center gap-2 flex-1">
                        <Input className="w-[150px]" value={editShiftName} onChange={(e) => setEditShiftName(e.target.value)} />
                        <Input className="w-[130px]" type="time" value={editShiftStart} onChange={(e) => setEditShiftStart(e.target.value)} />
                        <Input className="w-[130px]" type="time" value={editShiftEnd} onChange={(e) => setEditShiftEnd(e.target.value)} />
                        <Button size="sm" variant="ghost" onClick={handleSaveEdit} disabled={updateShift.isPending}>
                          <Check className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingShiftId(null)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{shift.name}</span>
                          <Badge variant="outline">{shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}</Badge>
                          {!shift.is_active && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEditShift(shift)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteShift.mutate(shift.id)} disabled={deleteShift.isPending}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}