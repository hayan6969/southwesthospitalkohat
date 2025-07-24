-- Add RLS policies for OTA role to access related tables

-- Allow OTA to view patients
CREATE POLICY "OTA can view patients" 
ON public.patients 
FOR SELECT
USING (EXISTS ( 
  SELECT 1
  FROM profiles
  WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ota'
));

-- Allow OTA to view profiles
CREATE POLICY "OTA can view profiles" 
ON public.profiles 
FOR SELECT
USING (EXISTS ( 
  SELECT 1
  FROM profiles p
  WHERE p.id = auth.uid() 
    AND p.role = 'ota'
));

-- Allow OTA to view OT operations
CREATE POLICY "OTA can view OT operations" 
ON public.ot_operations 
FOR SELECT
USING (EXISTS ( 
  SELECT 1
  FROM profiles
  WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ota'
));

-- Allow OTA to view OT rooms
CREATE POLICY "OTA can view OT rooms" 
ON public.ot_rooms 
FOR SELECT
USING (EXISTS ( 
  SELECT 1
  FROM profiles
  WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ota'
));