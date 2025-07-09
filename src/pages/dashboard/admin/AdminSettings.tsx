import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface HospitalSettings {
  opening_time: string;
  closing_time: string;
  appointment_duration: number;
  max_appointments_per_day: number;
  working_days: string[];
  emergency_contact: string;
  hospital_name: string;
}

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
];

export default function AdminSettings() {
  const [settings, setSettings] = useState<HospitalSettings>({
    opening_time: "08:00",
    closing_time: "18:00", 
    appointment_duration: 30,
    max_appointments_per_day: 50,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    emergency_contact: "",
    hospital_name: "City Hospital"
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('hospital_settings')
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          opening_time: data.opening_time || "08:00",
          closing_time: data.closing_time || "18:00",
          appointment_duration: data.appointment_duration || 30,
          max_appointments_per_day: data.max_appointments_per_day || 50,
          working_days: data.working_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          emergency_contact: data.emergency_contact || "",
          hospital_name: data.hospital_name || "City Hospital"
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('hospital_settings')
        .upsert({
          id: 'default',
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Settings saved successfully");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings");
    }
    setLoading(false);
  };

  const handleWorkingDayToggle = (day: string, checked: boolean) => {
    if (checked) {
      setSettings(prev => ({
        ...prev,
        working_days: [...prev.working_days, day]
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        working_days: prev.working_days.filter(d => d !== day)
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hospital Settings</h2>
          <p className="text-gray-600">Configure hospital operations and appointment system</p>
        </div>
        <Button onClick={saveSettings} disabled={loading} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Appointments
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Hospital Information</CardTitle>
              <CardDescription>Basic hospital information and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="hospital_name">Hospital Name</Label>
                <Input
                  id="hospital_name"
                  value={settings.hospital_name}
                  onChange={(e) => setSettings(prev => ({ ...prev, hospital_name: e.target.value }))}
                  placeholder="Enter hospital name"
                />
              </div>
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={settings.emergency_contact}
                  onChange={(e) => setSettings(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  placeholder="Enter emergency contact number"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Configuration</CardTitle>
              <CardDescription>Configure appointment duration and daily limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="appointment_duration">Appointment Duration (minutes)</Label>
                <Select
                  value={settings.appointment_duration.toString()}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, appointment_duration: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="max_appointments">Maximum Appointments per Day</Label>
                <Input
                  id="max_appointments"
                  type="number"
                  value={settings.max_appointments_per_day}
                  onChange={(e) => setSettings(prev => ({ ...prev, max_appointments_per_day: parseInt(e.target.value) || 0 }))}
                  placeholder="Enter maximum appointments per day"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Working Hours & Days</CardTitle>
              <CardDescription>Set hospital operating hours and working days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="opening_time">Opening Time</Label>
                  <Input
                    id="opening_time"
                    type="time"
                    value={settings.opening_time}
                    onChange={(e) => setSettings(prev => ({ ...prev, opening_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="closing_time">Closing Time</Label>
                  <Input
                    id="closing_time"
                    type="time"
                    value={settings.closing_time}
                    onChange={(e) => setSettings(prev => ({ ...prev, closing_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label>Working Days</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Switch
                        id={day.value}
                        checked={settings.working_days.includes(day.value)}
                        onCheckedChange={(checked) => handleWorkingDayToggle(day.value, checked)}
                      />
                      <Label htmlFor={day.value}>{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}