-- Add foreign key constraints to xray_reports table
ALTER TABLE public.xray_reports 
ADD CONSTRAINT xray_reports_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES public.profiles(id);

ALTER TABLE public.xray_reports 
ADD CONSTRAINT xray_reports_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES public.profiles(id);

ALTER TABLE public.xray_reports 
ADD CONSTRAINT xray_reports_test_id_fkey 
FOREIGN KEY (test_id) REFERENCES public.xray_tests(id);