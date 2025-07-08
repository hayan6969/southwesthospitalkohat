import { useState } from "react";
import { useUpdateDoctor } from "@/hooks/useDatabase";
import { useAuth } from "@/hooks/useAuth";
import { DollarSign, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DoctorConsultationRates() {
  const { user } = useAuth();
  const [consultationFee, setConsultationFee] = useState("");
  const updateDoctor = useUpdateDoctor();

  const handleSave = async () => {
    if (!user?.id || !consultationFee) {
      toast.error("Please enter a consultation fee");
      return;
    }

    try {
      await updateDoctor.mutateAsync({
        id: user.id,
        consultation_fee: parseFloat(consultationFee)
      });
      toast.success("Consultation rate updated successfully");
    } catch (error) {
      toast.error("Failed to update consultation rate");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consultation Rates</h1>
        <p className="text-gray-600 mt-1">Manage your consultation fees and rates</p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Set Consultation Fee
          </CardTitle>
          <CardDescription>
            Set your standard consultation fee that will be used when creating appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fee">Consultation Fee (PKR)</Label>
            <Input
              id="fee"
              type="number"
              min="0"
              step="0.01"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              placeholder="Enter consultation fee"
            />
          </div>
          
          <Button 
            onClick={handleSave} 
            disabled={updateDoctor.isPending || !consultationFee}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateDoctor.isPending ? "Saving..." : "Save Rate"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}