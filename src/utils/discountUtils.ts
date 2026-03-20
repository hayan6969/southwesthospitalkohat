import { supabase } from "@/integrations/supabase/client";

export type ServiceType = 'consultation' | 'lab' | 'xray' | 'ot';

/**
 * Fetches the active discount for a patient for a specific service type,
 * checks expiry and used status, calculates the discounted amount, and marks the discount as used.
 */
export async function applyPatientDiscount(patientId: string, originalAmount: number, serviceType: ServiceType) {
  try {
    const { data, error } = await supabase
      .from('patient_discounts')
      .select('id, discount_type, discount_value, expires_at, used_at, service_type')
      .eq('patient_id', patientId)
      .eq('is_active', true)
      .eq('service_type', serviceType)
      .maybeSingle();

    if (error || !data) {
      return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
    }

    if (data.used_at) {
      return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      const { error: expireError } = await supabase
        .from('patient_discounts')
        .update({ is_active: false })
        .eq('id', data.id);

      if (expireError) throw expireError;

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

    const usedAt = new Date().toISOString();
    const { data: consumedDiscount, error: consumeError } = await supabase
      .from('patient_discounts')
      .update({
        used_at: usedAt,
        is_active: false,
      })
      .eq('id', data.id)
      .eq('is_active', true)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (consumeError) {
      console.error('Error consuming discount:', consumeError);
      // Don't silently fail - still apply the discount since we already calculated it
      // The discount may not be marked as used, but the patient gets the discount
    }

    if (!consumedDiscount && !consumeError) {
      // Race condition: discount was already consumed by another request
      console.warn('Discount already consumed by another request');
      return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
    }

    return {
      originalAmount,
      discountedAmount: originalAmount - discountApplied,
      discountApplied,
      discountLabel,
    };
  } catch (err) {
    console.error('Discount application error:', err);
    return { originalAmount, discountedAmount: originalAmount, discountApplied: 0, discountLabel: null };
  }
}
