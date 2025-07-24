-- Add RLS policy for doctors to view their own OT schedules
CREATE POLICY "Doctors can view their own OT schedules" 
ON public.ot_schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'doctor' 
    AND ot_schedules.doctor_id = auth.uid()
  )
);

-- Add RLS policy for doctors to update their own OT schedules (for adding notes, changing status)
CREATE POLICY "Doctors can update their own OT schedules" 
ON public.ot_schedules 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'doctor' 
    AND ot_schedules.doctor_id = auth.uid()
  )
);