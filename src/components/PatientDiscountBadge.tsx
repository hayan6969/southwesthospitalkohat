import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { formatPkrAmount } from "@/utils/currency";

interface Props {
  patientId: string | null | undefined;
  originalAmount: number;
}

export function PatientDiscountBadge({ patientId, originalAmount }: Props) {
  const { data: discount } = useQuery({
    queryKey: ['patient-discount-preview', patientId],
    queryFn: async () => {
      if (!patientId) return null;
      const { data, error } = await supabase
        .from('patient_discounts')
        .select('discount_type, discount_value, expires_at, used_at')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .maybeSingle();
      if (error || !data) return null;
      if (data.used_at) return null;
      if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
      return data;
    },
    enabled: !!patientId,
  });

  if (!discount || originalAmount <= 0) return null;

  let discountApplied = 0;
  let label = '';
  if (discount.discount_type === 'percentage') {
    discountApplied = Math.round((originalAmount * discount.discount_value) / 100);
    label = `${discount.discount_value}% off`;
  } else {
    discountApplied = Math.min(discount.discount_value, originalAmount);
    label = `${formatPkrAmount(discount.discount_value)} off`;
  }

  const finalAmount = originalAmount - discountApplied;

  return (
    <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-sm space-y-1">
      <div className="flex items-center gap-1.5 text-green-700 font-medium">
        <Tag className="w-3.5 h-3.5" />
        Patient Discount: {label}
      </div>
      <div className="flex justify-between text-green-800">
        <span>Original: {formatPkrAmount(originalAmount)}</span>
        <span className="font-semibold">After Discount: {formatPkrAmount(finalAmount)}</span>
      </div>
    </div>
  );
}
