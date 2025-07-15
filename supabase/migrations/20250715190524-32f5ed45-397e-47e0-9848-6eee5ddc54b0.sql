-- Fix the delete_user_safely function with proper type handling
CREATE OR REPLACE FUNCTION public.delete_user_safely(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete related records in proper order to avoid foreign key constraints
  
  -- Delete audit logs (user_id is uuid)
  DELETE FROM public.audit_logs WHERE user_id = user_uuid;
  
  -- Delete appointments where user is a patient
  DELETE FROM public.appointments WHERE patient_id = user_uuid;
  
  -- Delete appointments where user is a doctor
  DELETE FROM public.appointments WHERE doctor_id = user_uuid;
  
  -- Delete lab reports where user is a patient
  DELETE FROM public.lab_reports WHERE patient_id = user_uuid;
  
  -- Delete lab reports where user is a doctor
  DELETE FROM public.lab_reports WHERE doctor_id = user_uuid;
  
  -- Delete medical records where user is a patient
  DELETE FROM public.medical_records WHERE patient_id = user_uuid;
  
  -- Delete medical records where user is a doctor
  DELETE FROM public.medical_records WHERE doctor_id = user_uuid;
  
  -- Delete invoices where user is a patient
  DELETE FROM public.invoices WHERE patient_id = user_uuid;
  
  -- Delete patient documents
  DELETE FROM public.patient_documents WHERE patient_id = user_uuid;
  
  -- Delete doctor availability
  DELETE FROM public.doctor_availability WHERE doctor_id = user_uuid;
  
  -- Delete doctor daily status
  DELETE FROM public.doctor_daily_status WHERE doctor_id = user_uuid;
  
  -- Delete doctor payments
  DELETE FROM public.doctor_payments WHERE doctor_id = user_uuid;
  
  -- Delete queue positions
  DELETE FROM public.queue_positions WHERE doctor_id = user_uuid;
  
  -- Delete OT schedules where user is a patient
  DELETE FROM public.ot_schedules WHERE patient_id = user_uuid;
  
  -- Delete OT schedules where user is a doctor
  DELETE FROM public.ot_schedules WHERE doctor_id = user_uuid;
  
  -- Delete payroll records
  DELETE FROM public.payroll WHERE employee_id = user_uuid;
  
  -- Delete payroll templates
  DELETE FROM public.payroll_templates WHERE employee_id = user_uuid;
  
  -- Delete from patients table if user is a patient
  DELETE FROM public.patients WHERE id = user_uuid;
  
  -- Delete from doctors table if user is a doctor
  DELETE FROM public.doctors WHERE id = user_uuid;
  
  -- Finally, delete the user profile
  DELETE FROM public.profiles WHERE id = user_uuid;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false
    RAISE LOG 'Error deleting user %: %', user_uuid, SQLERRM;
    RETURN false;
END;
$$;