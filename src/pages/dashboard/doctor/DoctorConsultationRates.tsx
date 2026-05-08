import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";

export default function DoctorConsultationRates() {
  const { user } = useAuth();
  const [consultationFee, setConsultationFee] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentFee, setCurrentFee] = useState<number>(0);
  const [feeSetByFinance, setFeeSetByFinance] = useState(false);
  const [feeUpdatedAt, setFeeUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentFee = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from("doctors")
          .select("consultation_fee, fee_set_by_finance, fee_updated_at")
          .eq("id", user.id)
          .single();
        if (error) throw error;
        const fee = data?.consultation_fee || 0;
        setCurrentFee(fee);
        setConsultationFee(fee > 0 ? fee.toString() : "");
        setFeeSetByFinance(!!(data as any)?.fee_set_by_finance);
        setFeeUpdatedAt((data as any)?.fee_updated_at || null);
      } catch (error) {
        console.error("Error fetching consultation fee:", error);
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
        .from("doctors")
        .update({ consultation_fee: newFee })
        .eq("id", user.id);
      if (error) throw error;
      setCurrentFee(newFee);
      toast.success("Consultation rate updated successfully");
    } catch (error: any) {
      toast.error(`Failed to update consultation rate: ${error.message}`);
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
            Consultation Fee
          </CardTitle>
          <CardDescription>
            Your standard consultation fee used when creating appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feeSetByFinance ? (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">
                  Your consultation fee of PKR {currentFee.toLocaleString()} has been set by the Finance Department.
                </p>
                <p>Contact finance to request changes.</p>
                {feeUpdatedAt && (
                  <p className="text-xs text-blue-600 mt-2">
                    Last updated: {format(new Date(feeUpdatedAt), "PPP")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {currentFee > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Current consultation fee:{" "}
                    <span className="font-semibold">PKR {currentFee.toLocaleString()}</span>
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
              <Button onClick={handleSave} disabled={loading || !consultationFee} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save Rate"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
