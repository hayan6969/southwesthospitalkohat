-- Permanent fix for the EMERGENCY placeholder patient.
--
-- Emergency consultation invoices reference a fixed placeholder patient
-- (00000000-0000-0000-0000-000000000001) because invoices.patient_id is
-- NOT NULL and REFERENCES public.patients(id). That placeholder kept getting
-- deleted by the admin "Delete user" flow (RPC delete_user_safely, which runs
-- SECURITY DEFINER and bypasses the RLS deletion-prevention policies), which
-- both broke emergency invoice creation AND would delete every past emergency
-- invoice (see "DELETE FROM public.invoices WHERE patient_id = user_uuid" below).
--
-- This migration:
--   1. Restores the placeholder in auth.users, profiles, and patients (idempotent).
--   2. Guards delete_user_safely so the placeholder can never be deleted again.

-- 1) Restore the EMERGENCY placeholder -------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, is_sso_user
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'emergency@placeholder.local',
  '',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false, false
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, role, first_name, last_name, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'patient', 'EMERGENCY', 'PLACEHOLDER', 'emergency@placeholder.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.patients (id, patient_number)
VALUES ('00000000-0000-0000-0000-000000000001', 'EMERGENCY')
ON CONFLICT (id) DO NOTHING;

-- 2) Guard delete_user_safely against deleting the placeholder -------------
CREATE OR REPLACE FUNCTION public.delete_user_safely(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Never delete the EMERGENCY placeholder patient. Deleting it would remove every
  -- emergency consultation invoice (DELETE FROM public.invoices below) and break
  -- future emergency invoice creation.
  IF user_uuid = '00000000-0000-0000-0000-000000000001' THEN
    RAISE EXCEPTION 'Cannot delete the EMERGENCY placeholder patient';
  END IF;

  -- Delete records where the user is in a required ownership/processor field
  DELETE FROM public.refunds WHERE processed_by = user_uuid;
  DELETE FROM public.staff_shift_closings WHERE staff_id = user_uuid;

  -- Clear optional references that should not block deletion while preserving records
  UPDATE public.expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.miscellaneous_income SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.emergency_expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.hospital_closing_balance SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.invoices SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.doctor_payments SET paid_by = NULL WHERE paid_by = user_uuid;
  UPDATE public.inventory_requests SET approved_by = NULL WHERE approved_by = user_uuid;
  UPDATE public.inventory_requests SET provided_by = NULL WHERE provided_by = user_uuid;
  UPDATE public.overtime_records SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.patient_discounts SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.patient_documents SET uploaded_by = NULL WHERE uploaded_by = user_uuid;
  UPDATE public.payroll SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.payroll_templates SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.pharmacy_account SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.pharmacy_expenses SET created_by = NULL WHERE created_by = user_uuid;
  UPDATE public.refunds SET doctor_id = NULL WHERE doctor_id = user_uuid;
  UPDATE public.staff_shift_closings SET approved_by = NULL WHERE approved_by = user_uuid;
  UPDATE public.xray_reports SET doctor_id = NULL WHERE doctor_id = user_uuid;

  -- Delete dependent records before deleting appointments/OT schedules/profiles
  DELETE FROM public.queue_positions WHERE appointment_id IN (
    SELECT id FROM public.appointments WHERE patient_id = user_uuid OR doctor_id = user_uuid
  );
  DELETE FROM public.postop_progress_entries WHERE ot_schedule_id IN (
    SELECT id FROM public.ot_schedules WHERE patient_id = user_uuid OR doctor_id = user_uuid
  );

  -- Delete user-owned rows from related tables
  DELETE FROM public.audit_logs WHERE user_id = user_uuid;
  DELETE FROM public.lab_reports WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.lab_stock_usage WHERE used_by = user_uuid;
  DELETE FROM public.medical_records WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.invoices WHERE patient_id = user_uuid;
  DELETE FROM public.patient_documents WHERE patient_id = user_uuid;
  DELETE FROM public.xray_reports WHERE patient_id = user_uuid;
  DELETE FROM public.appointments WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.doctor_availability WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_daily_status WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_payments WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_working_hours WHERE doctor_id = user_uuid;
  DELETE FROM public.doctor_specific_schedules WHERE doctor_id = user_uuid;
  DELETE FROM public.queue_positions WHERE doctor_id = user_uuid;
  DELETE FROM public.ot_schedules WHERE patient_id = user_uuid OR doctor_id = user_uuid;
  DELETE FROM public.payroll WHERE employee_id::text = user_uuid::text;
  DELETE FROM public.payroll_templates WHERE employee_id::text = user_uuid::text;
  DELETE FROM public.overtime_records WHERE employee_id = user_uuid;
  DELETE FROM public.inventory_requests WHERE requested_by = user_uuid;
  DELETE FROM public.patient_discounts WHERE patient_id = user_uuid;
  DELETE FROM public.patients WHERE id = user_uuid;
  DELETE FROM public.doctors WHERE id = user_uuid;
  DELETE FROM public.profiles WHERE id = user_uuid;
  DELETE FROM auth.users WHERE id = user_uuid;

  RETURN true;
END;
$$;
