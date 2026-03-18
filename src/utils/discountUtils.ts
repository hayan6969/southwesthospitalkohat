import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the active discount for a patient, checks expiry and used status,
 * calculates the discounted amount, and marks the discount as used.
 */
export async function applyPatientDiscount(patientId: string, originalAmount: number) {
  try {
    const { data, error } = await supabase
      .from('patient_discounts')
      .select('id, discount_type, discount_value, expires_at, used_at')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
    }

    // Already used (one-time)
    if (data.used_at) {
      return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
    }

    // Expired (48hr validity)
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // Auto-deactivate expired discount
      await supabase.from('patient_discounts').update({ is_active: false }).eq('id', data.id);
      return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
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

    // Mark as used and deactivate (one-time use)
    await supabase.from('patient_discounts').update({
      used_at: new Date().toISOString(),
      is_active: false,
    }).eq('id', data.id);

    return {
      originalAmount,
      discountedAmount: originalAmount - discountApplied,
      discountApplied,
      discountLabel,
    };
  } catch {
    return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
  }
}
