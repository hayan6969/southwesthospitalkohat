import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function DoctorConsultationRates() {
  const { user } = useAuth();
  const [consultationFee, setConsultationFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentFee, setCurrentFee] = useState<number>(0);

  // Fetch current consultation fee when component mounts
  useEffect(() => {
    const fetchCurrentFee = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('consultation_fee')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        const fee = data?.consultation_fee || 0;
        setCurrentFee(fee);
        setConsultationFee(fee.toString());
      } catch (error) {
        console.error('Error fetching consultation fee:', error);
      }
    };

    fetchCurrentFee();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id || !consultationFee) {
      toast.error("Please enter a consultation fee");
      return;
    }

    try {
      setLoading(true);
      
      const newFee = parseFloat(consultationFee);
      
      const { error } = await supabase
        .from('doctors')
        .update({ consultation_fee: newFee })
        .eq('id', user.id);

      if (error) throw error;
      
      setCurrentFee(newFee);
      toast.success("Consultation rate updated successfully");
    } catch (error) {
      console.error("Error updating consultation rate:", error);
      toast.error("Failed to update consultation rate");
    } finally {
      setLoading(false);
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
            <Banknote className="w-5 h-5" />
            Set Consultation Fee
          </CardTitle>
          <CardDescription>
            Set your standard consultation fee that will be used when creating appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentFee > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                Current consultation fee: <span className="font-semibold">PKR {currentFee.toLocaleString()}</span>
              </p>
            </div>
          )}
          
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
            disabled={loading || !consultationFee}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Rate"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}