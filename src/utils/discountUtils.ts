import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the active discount for a patient and calculates the discounted amount.
 * Returns { originalAmount, discountedAmount, discountApplied, discountLabel }
 */
export async function applyPatientDiscount(patientId: string, originalAmount: number) {
  try {
    const { data, error } = await supabase
      .from('patient_discounts')
      .select('discount_type, discount_value')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return {
        originalAmount,
        discountedAmount: originalAmount,
        discountApplied: 0,
        discountLabel: null,
      };
    }

    let discountApplied = 0;
    let discountLabel = '';

    if (data.discount_type === 'percentage') {
      discountApplied = Math.round((originalAmount * data.discount_value) / 100);
      discountLabel = `${data.discount_value}% discount`;
    } else {
      discountApplied = Math.min(data.discount_value, originalAmount);
      discountLabel = `Rs. ${data.discount_value} discount`;
    }

    return {
      originalAmount,
      discountedAmount: originalAmount - discountApplied,
      discountApplied,
      discountLabel,
    };
  } catch {
    return {
      originalAmount,
      discountedAmount: originalAmount,
      discountApplied: 0,
      discountLabel: null,
    };
  }
}
