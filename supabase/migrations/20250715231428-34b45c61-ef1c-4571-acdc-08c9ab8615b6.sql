-- Create a special offline patient that cannot be deleted
INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'offline@system.local',
  'Offline',
  'Patient',
  'patient',
  '0000000000'
) ON CONFLICT (id) DO NOTHING;

-- Create the corresponding patient record
INSERT INTO public.patients (id, patient_number, cnic, date_of_birth, address)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'P-OFFLINE',
  'OFFLINE-SYSTEM',
  '1900-01-01',
  'Offline Transaction System'
) ON CONFLICT (id) DO NOTHING;

-- Create a policy to prevent deletion of the offline patient
CREATE POLICY "Prevent deletion of offline patient" 
ON public.patients 
FOR DELETE 
USING (id != '00000000-0000-0000-0000-000000000001');

-- Create a policy to prevent deletion of the offline profile
CREATE POLICY "Prevent deletion of offline profile" 
ON public.profiles 
FOR DELETE 
USING (id != '00000000-0000-0000-0000-000000000001');