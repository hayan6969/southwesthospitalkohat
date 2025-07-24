-- Add RLS policy for OTA role to access OT schedules
CREATE POLICY "OTA users can view and update OT schedules" 
ON public.ot_schedules 
FOR ALL
USING (EXISTS ( 
  SELECT 1
  FROM profiles
  WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ota'
))
WITH CHECK (EXISTS ( 
  SELECT 1
  FROM profiles
  WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ota'
));