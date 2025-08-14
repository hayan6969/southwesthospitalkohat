-- Add policy to allow patients to create their own appointments
CREATE POLICY "Patients can create their own appointments" 
ON public.appointments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'patient' 
    AND appointments.patient_id = auth.uid()
  )
);