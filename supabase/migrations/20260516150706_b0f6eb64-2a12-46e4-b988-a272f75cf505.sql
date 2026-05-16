CREATE OR REPLACE FUNCTION public.generate_daily_doctor_payments(target_date date)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  records_count INTEGER;
BEGIN
  WITH doctor_consultations AS (
    SELECT 
      i.doctor_id,
      COUNT(DISTINCT i.id) AS appointment_count,
      COALESCE(SUM(i.amount), 0) AS consultation_earnings
    FROM public.invoices i
    WHERE i.status = 'paid'
      AND i.invoice_number LIKE 'INV-%'
      AND i.created_at::date = target_date
      AND (i.description IS NULL OR LOWER(i.description) NOT LIKE '%emergency%')
      AND i.emergency_patient_data IS NULL
      AND i.doctor_id IS NOT NULL
    GROUP BY i.doctor_id
  ),
  doctor_ot AS (
    SELECT
      o.doctor_id,
      COUNT(DISTINCT o.id) AS ot_count,
      COALESCE(SUM(o.doctor_expense), 0) AS ot_earnings,
      COALESCE(SUM(COALESCE(o.total_cost, 0) - COALESCE(o.doctor_expense, 0)), 0) AS hospital_share
    FROM public.ot_schedules o
    WHERE o.status IN ('completed', 'pending')
      AND o.created_at::date = target_date
      AND o.doctor_id IS NOT NULL
    GROUP BY o.doctor_id
  ),
  ipd_earnings AS (
    SELECT
      a.doctor_id,
      COUNT(DISTINCT inv.admission_id) AS ipd_count,
      COALESCE(SUM(inv.doctor_charges_total), 0) AS ipd_doctor_fees,
      COALESCE(SUM(inv.anesthesia_charges_total), 0) AS ipd_anesthesia_fees
    FROM public.ipd_invoices inv
    JOIN public.ipd_admissions a ON a.id = inv.admission_id
    WHERE inv.finalized_at::date = target_date
      AND a.doctor_id IS NOT NULL
    GROUP BY a.doctor_id
  ),
  combined AS (
    SELECT 
      COALESCE(dc.doctor_id, dot.doctor_id, ie.doctor_id) AS doctor_id,
      COALESCE(dc.appointment_count, 0) AS appointment_count,
      COALESCE(dot.ot_count, 0) AS ot_count,
      COALESCE(dc.consultation_earnings, 0) AS consultation_earnings,
      COALESCE(dot.ot_earnings, 0) AS ot_earnings,
      COALESCE(dot.hospital_share, 0) AS hospital_share,
      COALESCE(ie.ipd_count, 0) AS ipd_count,
      COALESCE(ie.ipd_doctor_fees, 0) AS ipd_doctor_fees,
      COALESCE(ie.ipd_anesthesia_fees, 0) AS ipd_anesthesia_fees
    FROM doctor_consultations dc
    FULL OUTER JOIN doctor_ot dot ON dc.doctor_id = dot.doctor_id
    FULL OUTER JOIN ipd_earnings ie ON COALESCE(dc.doctor_id, dot.doctor_id) = ie.doctor_id
  )
  INSERT INTO public.doctor_payments (
    doctor_id, period_start, period_end,
    appointment_count, ot_count,
    consultation_earnings, ot_earnings, total_earnings,
    hospital_share, doctor_share, hospital_share_percentage, payment_status
  )
  SELECT
    c.doctor_id, target_date, target_date,
    c.appointment_count + c.ipd_count,
    c.ot_count,
    c.consultation_earnings + c.ipd_doctor_fees,
    c.ot_earnings + c.ipd_anesthesia_fees,
    c.consultation_earnings + c.ot_earnings + c.ipd_doctor_fees + c.ipd_anesthesia_fees,
    c.hospital_share,
    c.consultation_earnings + c.ot_earnings + c.ipd_doctor_fees + c.ipd_anesthesia_fees,
    40,
    'pending'
  FROM combined c
  WHERE c.doctor_id IS NOT NULL
  ON CONFLICT (doctor_id, period_start, period_end)
  DO UPDATE SET
    appointment_count = EXCLUDED.appointment_count,
    ot_count = EXCLUDED.ot_count,
    consultation_earnings = EXCLUDED.consultation_earnings,
    ot_earnings = EXCLUDED.ot_earnings,
    total_earnings = EXCLUDED.total_earnings,
    hospital_share = EXCLUDED.hospital_share,
    doctor_share = EXCLUDED.doctor_share,
    payment_status = 'pending',
    updated_at = NOW();

  GET DIAGNOSTICS records_count = ROW_COUNT;
  RETURN records_count;
END;
$$;